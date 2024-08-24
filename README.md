# signed-commit
[![CI][ci_badge]][ci_workflows]

[signed-commit](https://github.com/ryancyq/signed-commit) is a rewrite of [commit](https://github.com/swinton/commit).

:fountain_pen: Create a **signed** commit with GitHub Actions. Learn more about [commit signature](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification) on GitHub.

## signed-commit vs commit
The inputs for **commit** and **signed-commit** are mostly the same.

In general, the only difference is that the input `ref` is replaced by `branch-name`. For more details, see the [Usage](#usage) section.

## Why signed-commit?

**commit** was written mostly with the [GitHub REST API for Git Database](https://docs.github.com/en/rest/git).

- Supports HTTP request streaming, which is more efficient in uploading large blob files to GitHub.

**signed-commit**, on the other hand, solely works with the [GitHub GraphQL API](https://docs.github.com/en/graphql).

- Uses the Git CLI to detect file changes against the file paths provided in the input.
- Uses a single GraphQL mutation request to upload all blob file content (the drawback is higher memory consumption during execution).
- Supports glob patterns for file paths.

## Usage
In your workflow, to commit your files, configure a step as follows:

```yaml
    - name: Commit file
      uses: ryancyq/signed-commit@v3
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        files: |
          path/to/myfile1
          path/to/myfile2
          path/to/myfile3
        commit-message: Committing ./myfile
        branch-name: my-branch
```

Note: The `GH_TOKEN` environment variable is **required** for GitHub API request authentication.

## Inputs
| Input | Required | Description |
| :--- | :---: | :---  |
| `files` | **YES** | Multi-line string of file paths to be committed, relative to the current workspace.|
| `workspace` | **NO** | Directory containing files to be committed. **Default:** GitHub workspace directory (root of the repository). |
| `commit-message` | **YES** | Commit message for the file changes. |
| `branch-name` | **NO** | Branch to commit, it must already exist in the remote. **Default:** Workflow triggered branch |

## Outputs
| Output | Description |
| :--- | :--- |
| `commit-sha` | SHA of the signed commit |

[ci_badge]: https://github.com/ryancyq/signed-commit/actions/workflows/ci.yml/badge.svg
[ci_workflows]: https://github.com/ryancyq/signed-commit/actions/workflows/ci.yml
