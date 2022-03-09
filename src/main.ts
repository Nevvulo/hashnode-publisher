import * as core from '@actions/core'
import { GraphQLClient, gql } from 'graphql-request'

const endpoint = 'https://api.hashnode.com'

interface CreatePostResponse {
  createPublicationStory: {
    success: boolean
    post?: PostResponse
  }
}

interface UpdatePostResponse {
  updateStory: {
    success: boolean
    post?: PostResponse
  }
}

interface PostResponse {
  _id: string
  slug: string
  publication: {
    domain: string
  }
}

interface PostProperties {
  id: string
  url: string
}

interface PostOptions {
  title: string
  image: string
  body: string
  originalUrl: string
}

function getPostData(data: PostResponse): PostProperties {
  if (!data) throw new Error('Response has no post data')
  return {
    id: data._id,
    // TODO: temporary
    url: `https://${data.publication.domain || 'hashnode.nevulo.xyz'}/${
      data.slug
    }`
  }
}

async function createPost(
  client: GraphQLClient,
  publicationId: string,
  options: PostOptions
): Promise<PostProperties | undefined> {
  const { title, body, image, originalUrl } = options
  const input = {
    title,
    contentMarkdown: body,
    coverImageURL: image,
    isRepublished: {
      originalArticleURL: originalUrl
    },
    tags: [] // TODO: how to support tags? needs _id
  }
  const query = gql`
    mutation createPublicationStory(
      $publicationId: String!
      $input: CreateStoryInput!
    ) {
      createPublicationStory(publicationId: $publicationId, input: $input) {
        success
        post {
          _id
          slug
          publication {
            domain
          }
        }
      }
    }
  `

  const variables = {
    publicationId,
    input
  }

  const response = await client.request<CreatePostResponse>(query, variables)
  core.debug(JSON.stringify(response))
  if (!response) throw new Error('Failed to create post: no data')
  const postData = response.createPublicationStory.post
  if (!response.createPublicationStory.success || !postData)
    throw new Error('Failed to create post: unsuccessful')
  return getPostData(postData)
}

async function updatePost(
  client: GraphQLClient,
  existingId: string,
  publicationId: string,
  options: PostOptions
): Promise<PostProperties | undefined> {
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
    mutation updateStory($postId: String!, $input: UpdateStoryInput!) {
      updateStory(postId: $postId, input: $input) {
        success
        post {
          _id
          slug
          publication {
            domain
          }
        }
      }
    }
  `

  const variables = {
    postId: existingId,
    input: inputObj
  }

  const response = await client.request<UpdatePostResponse>(query, variables)
  const postData = response.updateStory.post
  if (!response.updateStory.success || !postData)
    throw new Error('Failed to update post: unsuccessful')
  return getPostData(postData)
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
    if (existingId) {
      const response = await updatePost(client, existingId, publicationId, post)
      if (!response) {
        core.setFailed('Bad response from Hashnode')
        process.exit(1)
      }
    } else {
      const response = await createPost(client, publicationId, post)
      if (!response) {
        core.setFailed('Bad response from Hashnode')
        process.exit(1)
      }
      core.setOutput('id', response.id)
      core.setOutput('url', response.url)
    }
  } catch (e) {
    core.debug(`${e}`)
    core.setFailed('Invalid API key provided (or some other error occured)')
    process.exit(1)
  }
}

function fatalError(text: string): void {
  core.setFailed(text)
  process.exit(1)
}

run()
