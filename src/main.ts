import * as core from '@actions/core'
import { GraphQLClient, gql } from 'graphql-request'

const endpoint = 'https://api.hashnode.com'

interface CreatePostResponse {
  data: {
    createPublicationStory: {
      success: boolean
      post?: {
        _id: string
      }
    }
  }
}

interface UpdatePostResponse {
  data: {
    updateStory: {
      success: boolean
      post?: {
        _id: string
      }
    }
  }
}

interface PostOptions {
  title: string
  image: string
  body: string
  originalUrl: string
}

async function createPost(
  client: GraphQLClient,
  publicationId: string,
  options: PostOptions
): Promise<string | undefined> {
  const { title, body, image, originalUrl } = options
  const inputObj = {
    title,
    contentMarkdown: body,
    coverImageURL: image,
    isRepublished: {
      originalArticleURL: originalUrl
    },
    tags: [] // TODO: how to support tags? needs _id
  }
  const query = gql`
    mutation CreatePublicationStory {
      createPublicationStory(publicationId: $publicationid, input: $input) {
        success
        post {
          _id
        }
      }
    }
  `

  const variables = {
    publicationid: publicationId,
    input: inputObj
  }

  const response = await client.request<CreatePostResponse>(query, variables)
  if (!response.data.createPublicationStory.success)
    throw new Error('Failed to create post: unsuccessful')
  return response.data.createPublicationStory.post?._id
}

async function updatePost(
  client: GraphQLClient,
  existingId: string,
  publicationId: string,
  options: PostOptions
): Promise<string | undefined> {
  const { title, body, image, originalUrl } = options
  const inputObj = {
    title,
    contentMarkdown: body,
    coverImageURL: image,
    isRepublished: {
      originalArticleURL: originalUrl
    },
    isPartOfPublication: {
      publicationId
    },
    tags: [] // TODO: how to support tags? needs _id
  }
  const query = gql`
    mutation UpdateStory {
      updateStory(postId: $postid, input: $input) {
        success
        post {
          _id
        }
      }
    }
  `

  const variables = {
    postid: existingId,
    publicationid: publicationId,
    input: inputObj
  }

  const response = await client.request<UpdatePostResponse>(query, variables)
  if (!response.data.updateStory.success)
    throw new Error('Failed to update post: unsuccessful')
  return response.data.updateStory.post?._id
}

async function run(): Promise<void> {
  const apiKey = core.getInput('api_key', { required: true })
  const publicationId = core.getInput('publication_id', { required: true })
  const title = core.getInput('title', { required: true })
  // TODO: 8 is an arbitrary number but I'm aware the Hashnode API throws
  // an error when providing a title (or body) that's only a few characters
  if (title.length < 8) return fatalError('Title too short')

  const body = core.getInput('body', { required: true })
  const image = core.getInput('main_image')
  const originalUrl = core.getInput('original_url')
  const existingId = core.getInput('id')

  const client = new GraphQLClient(endpoint, {
    headers: {
      Authorization: apiKey
    }
  })

  try {
    const post = {
      title,
      image,
      body,
      originalUrl
    }
    let postId = ''
    if (existingId) {
      postId = (await updatePost(client, existingId, publicationId, post)) ?? ''
    } else {
      postId = (await createPost(client, publicationId, post)) ?? ''
    }
    core.setOutput('id', postId)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.debug(e)
    core.setFailed('Invalid API key provided (or some other error occured)')
    process.exit(1)
  }
}

function fatalError(text: string): void {
  core.setFailed(text)
  process.exit(1)
}

run()
