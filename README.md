# :fountain_pen: Create a **signed** commit with GitHub Actions

[![CI][ci_badge]][ci_workflows]

Learn more about [commit signature](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification) on GitHub.

## Features

Works with the [GitHub GraphQL API](https://docs.github.com/en/graphql).

- Uses the Git CLI to detect file changes against the file paths provided in the input.
- Uses a single GraphQL mutation request to upload all blob file content.
- Supports glob patterns for file paths.

## Known Limitation
Does not support HTTP request streaming, so the action runner will consume more memory during execution when uploading large blob files.

## Usage
In your workflow, to commit your files, configure a step as follows:

```yaml
jobs:
  <job-id>:
    permissions:
      contents: write # grant secrets.GITHUB_TOKEN permission to push file changes
  
    - name: Commit file
      uses: ryancyq/signed-commit@v1
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        files: |
          path/to/myfile1
          path/to/myfile2
          path/to/myfile3
        commit-message: Committing files
```

Note: The `GH_TOKEN` environment variable is **required** for GitHub API request authentication.

## Inputs
| Input | Required | Description |
| :--- | :---: | :---  |
| `files` | **YES** | Multi-line string of file paths to be committed, relative to the current workspace.|
| `workspace` | **NO** | Directory containing files to be committed. **DEFAULT:** GitHub workspace directory (root of the repository). |
| `commit-message` | **YES** | Commit message for the file changes. |
| `branch-name` | **NO** | Branch to commit, it must already exist in the remote. **DEFAULT:** Workflow triggered branch |
| `branch-push-force` | **NO** | `--force` flag when running `git push <branch-name>`. |

## Outputs
| Output | Description |
| :--- | :--- |
| `commit-sha` | Full SHA of the signed commit |

[ci_badge]: https://github.com/ryancyq/signed-commit/actions/workflows/ci.yml/badge.svg
[ci_workflows]: https://github.com/ryancyq/signed-commit/actions/workflows/ci.yml
