# :fountain_pen: Create **signed** commits with GitHub Actions

[![CI][ci_badge]][ci_workflows]
[![Coverage][coverage_badge]][coverage]
[![Maintainability][maintainability_badge]][maintainability]

Learn more about [commit signature](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification) on GitHub.

## Features

Works with the [GitHub GraphQL API](https://docs.github.com/en/graphql).

- Uses the Git CLI to detect file changes against the file paths provided in the input.
- Uses a single GraphQL mutation request to upload all blob file content.
- Supports glob patterns for file paths.
- Push tag to the new/current commit on a branch.

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
      uses: ryancyq/github-signed-commit@v1
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        files: |
          path/to/myfile1
          path/to/*.md
          path/to/**/*.js
        commit-message: Committing files
```

```yaml
jobs:
  <job-id>:
    permissions:
      contents: write # grant secrets.GITHUB_TOKEN permission to push file changes
  
    - name: Commit file
      uses: ryancyq/github-signed-commit@v1
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        files: path/to/myversion
        commit-message: Release new version
        tag: v1.0.3
```

Note: The `GH_TOKEN` environment variable is **required** for GitHub API request authentication.

## Inputs
| Input | Required | Description |
| :--- | :---: | :---  |
| `files` | **YES** | Multi-line string of file paths to be committed, relative to the current workspace.|
| `workspace` | **NO** | Directory containing files to be committed. **DEFAULT:** GitHub workspace directory (root of the repository). |
| `commit-message` | **YES** | Commit message for the file changes. |
| `owner` | **NO** | GitHub repository owner (user or organization), defaults to the repo invoking the action. |
| `repo` | **NO** | GitHub repository name, defaults to the repo invoking the action. |
| `branch-name` | **NO*** | Branch to commit, it must already exist in the remote. **DEFAULT:** Workflow triggered branch. **REQUIRED:** If triggered through `on tags`.|
| `branch-push-force` | **NO** | `--force` flag when running `git push <branch-name>`. |
| `tag` | **NO** | Push tag for the new/current commit. |
| `tag-only-if-file-changes` | **NO** | Push tag for new commit only when file changes present. **DEFAULT:** true |

## Outputs
| Output | Description |
| :--- | :--- |
| `commit-sha` | Full SHA of the signed commit. |
| `tag` | Tag of the signed commit. |

## Release

This project follows [Conventional Commits](https://www.conventionalcommits.org/) and uses a manual release workflow.

1. Ensure `dist/` is up-to-date by running `npm run bundle`
2. Trigger the **Release** workflow via `workflow_dispatch` with the desired [semver](https://semver.org/) version
    - The workflow bumps `package.json`, creates a signed commit, and tags `v{version}`
3. The **Changelog** workflow automatically regenerates `CHANGELOG.md` from conventional commits using [git-cliff](https://git-cliff.org/)

[ci_badge]: https://github.com/ryancyq/github-signed-commit/actions/workflows/ci.yml/badge.svg
[ci_workflows]: https://github.com/ryancyq/github-signed-commit/actions/workflows/ci.yml
[coverage_badge]: https://codecov.io/gh/ryancyq/github-signed-commit/graph/badge.svg?token=KZTD2F2MN2
[coverage]: https://codecov.io/gh/ryancyq/github-signed-commit
[maintainability_badge]: https://api.codeclimate.com/v1/badges/0de9dbec270ca85719c6/maintainability
[maintainability]: https://codeclimate.com/github/ryancyq/github-signed-commit/maintainability
