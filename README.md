# Publish to Hashnode GitHub Action

A GitHub action that allows you to publish new posts and updating existing posts through the [Hashnode](https://api.hashnode.com/) GraphQL API.

## Using the action

You can use the action in your workflow by adding a step with `uses: Nevvulo/hashnode-publisher@1.0.0`

```yaml
name: Create post
on: push
jobs:
  create_post:
    runs-on: ubuntu-latest

    steps:
      - uses: Nevvulo/hashnode-publisher@1.0.0
        with:
          publication_id: '[your publication ID here (from URL)]'
          title: Testing this great little action
          description: Wow, it actually works!
          main_image: '[link to .png image]'
          body: '# Testing with GitHub actions\nWelcome to the robot age'
          api_key: '[your Hashnode API key here]'
```

### Updating an existing post

Add an option for `id` to the action (in the `with` section) with a string relating to the ID of the post you want to update.

## Options

`publication_id` (required)

The ID of the publication to publish (or update) a post to

`title` (required)

Title of the post

`description` (required)

Description of the post

`main_image`

The main image for the post

`body` (required)

The body of the post, can include Markdown

`api_key` (required)

The dev.to API key to publish the post using
