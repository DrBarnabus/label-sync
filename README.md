# label-sync

Github Action to sync labels in a particular repo with a yaml file for easy cross repo configuration.

## Example

`.github/labels.yml`
```yaml
labels:
- name: bug
  description: 'Label for a bug'
  color: 'd73a4a'
- name: feature
  color: '00ff00'
```

`.github/workflows/label-sync.yml`
```yaml
name: 'Label Sync'
on:
  push:
    branches:
    - main
    paths:
    - .github/workflows/label-sync.yml
    - .github/labels.yml

jobs:
  label-sync:
    name: 'Sync Labels'
    runs-on: ubuntu-latest
    steps:
    - uses: DrBarnabus/label-sync@v0
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
```

## Workflow Parameters

__token__ - The GitHub API Token, for example `${{ secrets.GITHUB_TOKEN }}`
__config-path__ - Optional override for the path to the configuration file. Defaults to `.github/labels.yml`
__owner__ - Optional override for the repo owner to apply to (if not appling to this repo)
__repo__ - Optional override for the repo to apply to (if not appling to this repo)

## Applying to multiple repos

Although recommended to have a `labels.yml` in each repository you are managing. In an advanced use case, you may want to have a global configuration for your labels and apply to many repos in the same organization/user (or even across multiple organizations/users).

To achieve this you must provide a PAT (Personal access token) for a github account with access to all repos. You can the use a workflow configuration similar to below to run the step for all repos listed.

`.github/workflows/label-sync.yml`
```yaml
name: 'Label Sync'
on:
  push:
    branches:
    - main
    paths:
    - .github/workflows/label-sync.yml
    - .github/labels.yml

jobs:
  label-sync:
    name: 'Sync Labels'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        repo: ['repo-one', 'repo-two', 'repo-three']
    steps:
    - uses: DrBarnabus/label-sync@v0
      with:
        token: ${{ secrets.GITHUB_PAT }}
        owner: 'DrBarnabus'
        repo: ${{ matrix.repo }}
```

_To sync to multiple organizations/users add more jobs with the appropriate repositories listed._