# Changelog

All notable changes to this project will be documented in this file. See [conventional commits](https://www.conventionalcommits.org/) for commit guidelines.

---
## [Unreleased](https://github.com/ryancyq/github-signed-commit/tree/HEAD)

### Bug Fixes

- handle binary content properly ([#9](https://github.com/ryancyq/github-signed-commit/issues/9)) - ([b793b7c](https://github.com/ryancyq/github-signed-commit/commit/b793b7cec39f3659d9a29f030223994686cbb01f)) - Xavier Krantz

### Documentation

- add support to repository input - ([f3899e6](https://github.com/ryancyq/github-signed-commit/commit/f3899e6baca1f1580ac3516468dd170a47a84d6f)) - Ryan Chang

### Features

- allow customized repository with owner - ([8f42b12](https://github.com/ryancyq/github-signed-commit/commit/8f42b1246b6287f96b2c628ed756d1debc681b3e)) - Ryan Chang
- Add support for remote GitHub repository + working directory ([#2](https://github.com/ryancyq/github-signed-commit/issues/2)) - ([9f01b63](https://github.com/ryancyq/github-signed-commit/commit/9f01b63120591cae14729ff96261d66a7fd7e4eb)) - Xavier Krantz
- Add support for Tags push events ([#3](https://github.com/ryancyq/github-signed-commit/issues/3)) - ([5d85f5f](https://github.com/ryancyq/github-signed-commit/commit/5d85f5f027d01342eff841614fe2a17e7e06925c)) - Xavier Krantz

### Tests

- read package name and version from npm instead of hardcoded string in test - ([f4b0185](https://github.com/ryancyq/github-signed-commit/commit/f4b01854663fe84c3b46d2ec663e2399c5cc9aed)) - Ryan Chang
- replace deprecated request mocking methods in fetch_mock@12 - ([ec6d8e3](https://github.com/ryancyq/github-signed-commit/commit/ec6d8e3b33f15813244e29eb096e67cef40cf17a)) - Ryan Chang
- use restore mocks to avoid leaky mocks - ([090c4f6](https://github.com/ryancyq/github-signed-commit/commit/090c4f6db1487443d042967f5cf1afd901000122)) - Ryan Chang
- add input repository tests - ([795d995](https://github.com/ryancyq/github-signed-commit/commit/795d995fc87d3ea724fae9535664d4abb1a94cac)) - Ryan Chang

---
## [1.2.0](https://github.com/ryancyq/github-signed-commit/compare/v1.1.0..v1.2.0) - 2024-10-02

### Bug Fixes

- process git status only from git tracked files - ([d4f4aa8](https://github.com/ryancyq/github-signed-commit/commit/d4f4aa86bb175db7fdd7987b317b65499d47aad8)) - Ryan Chang

### Documentation

- add codeclimate badge - ([4316735](https://github.com/ryancyq/github-signed-commit/commit/4316735b027405547f152fe417cf7c19e7a2c8fa)) - Ryan Chang

### Refactoring

- unified stdout/stderr for git cli commands - ([0b3db5a](https://github.com/ryancyq/github-signed-commit/commit/0b3db5a8aec343dbd938d62d2dc6e1ff18dcdb1f)) - Ryan Chang
- unified graphql request logging and error handling - ([ca96c9b](https://github.com/ryancyq/github-signed-commit/commit/ca96c9bfaa03aa0b75d8034caa053d612c7fb11e)) - Ryan Chang
- git file changes processing - ([8b5e2b0](https://github.com/ryancyq/github-signed-commit/commit/8b5e2b0cdd74621d45bb2f9adb76fbc7ad31b2d9)) - Ryan Chang
- graphql log message formatting - ([67b0fa0](https://github.com/ryancyq/github-signed-commit/commit/67b0fa0f888aea86885916c328beb652051e8e79)) - Ryan Chang
- simplify object assign - ([c2fa4b9](https://github.com/ryancyq/github-signed-commit/commit/c2fa4b9e6a818d20359235bc6d4f31243064f982)) - Ryan Chang

### Tests

- update graphql tests around log message - ([24746db](https://github.com/ryancyq/github-signed-commit/commit/24746dbf9a8707c2d6200ca84b7bdecd0a45f8f5)) - Ryan Chang
- add test on git status exec cmd - ([e5ca112](https://github.com/ryancyq/github-signed-commit/commit/e5ca1120b0bf411090367a2780c9dcd782ba489c)) - Ryan Chang

---
## [1.1.0](https://github.com/ryancyq/github-signed-commit/compare/v1.0.3..v1.1.0) - 2024-09-27

### Bug Fixes

- extract repo, owner, branch resolution logic - ([ed0d4a0](https://github.com/ryancyq/github-signed-commit/commit/ed0d4a0e02c786ffb1b5ec53929fcab28a957fcf)) - Ryan Chang
- file commit when files input is non empty and tag commit when tag input is non empty - ([6328922](https://github.com/ryancyq/github-signed-commit/commit/63289229445fb21a8d8c13d2642bf7885b52283c)) - Ryan Chang
- handle no file changes gracefully - ([c215e44](https://github.com/ryancyq/github-signed-commit/commit/c215e4495fdfaa0b2aad77edf73ff4d56baa000b)) - Ryan Chang
- unified tag commit selection - ([fa5adbc](https://github.com/ryancyq/github-signed-commit/commit/fa5adbc2d37fa39e28a1ce5096de982bbe2cabb0)) - Ryan Chang
- tag grapqhl syntax - ([f75b136](https://github.com/ryancyq/github-signed-commit/commit/f75b136935ab68f1510403add803325a91801289)) - Ryan Chang
- file not exist error message - ([97c8cb5](https://github.com/ryancyq/github-signed-commit/commit/97c8cb501ef33d7a06dd5869c869dfeb7d38bc66)) - Ryan Chang

### Documentation

- add glob file pattern examples in README.md - ([0b1716e](https://github.com/ryancyq/github-signed-commit/commit/0b1716ed349fb8abb161739c9d39169d62189e22)) - Ryan Chang

### Features

- create tag when creating commit on branch - ([e0b7c0d](https://github.com/ryancyq/github-signed-commit/commit/e0b7c0dec8440667d3ad5a0e4cfbef6f0b2736f2)) - Ryan Chang
- add tag input usage - ([5ca7e38](https://github.com/ryancyq/github-signed-commit/commit/5ca7e38ad805eddc96eb449f948ad88c51b1a9a0)) - Ryan Chang
- use separate methods for create tag and create commit since tag can be created on the new commit - ([bbad16f](https://github.com/ryancyq/github-signed-commit/commit/bbad16facc01b73565fc1e622fb607d0b6984692)) - Ryan Chang
- allow configurable push tag behavior when no file changes - ([58a0a61](https://github.com/ryancyq/github-signed-commit/commit/58a0a613526d47721b2ed26049342902172fb523)) - Ryan Chang
- update input definitions and doc for tag commit - ([ed75cff](https://github.com/ryancyq/github-signed-commit/commit/ed75cff4728b73b4bff9816f4974c8e4943a1dc3)) - Ryan Chang
- output committed tag - ([bfa7bee](https://github.com/ryancyq/github-signed-commit/commit/bfa7bee94800339687a10f4de196a72b9bfd0d6e)) - Ryan Chang
- update input definitions and readme for tag output - ([f2e8558](https://github.com/ryancyq/github-signed-commit/commit/f2e85585fa5739ae20d0270da265834ef9c7fc21)) - Ryan Chang

### Refactoring

- grapqhl query formatting - ([5790249](https://github.com/ryancyq/github-signed-commit/commit/5790249e855606799b3041aa64e9a07caf67bbfd)) - Ryan Chang

### Tests

- update existing createCommitOnBranch graphql test - ([f3b89a0](https://github.com/ryancyq/github-signed-commit/commit/f3b89a04c5f34e8ac30e5a976dc26772ad8e2d2f)) - Ryan Chang
- update graphql test for create commit/tag - ([bc78a84](https://github.com/ryancyq/github-signed-commit/commit/bc78a84c2af40a765bcfedd47b1450df026605a4)) - Ryan Chang
- add test case for commit file and push tag - ([2f60927](https://github.com/ryancyq/github-signed-commit/commit/2f6092706859d5bb5aec5384dfae47c4e0f8b48e)) - Ryan Chang
- tag only action test - ([cbb2484](https://github.com/ryancyq/github-signed-commit/commit/cbb24848ac95f897c4c3e4a0bc58ce9a9a0168aa)) - Ryan Chang
- file + tag action test - ([06d778a](https://github.com/ryancyq/github-signed-commit/commit/06d778abd20664414bb59aed7dcd31ba6a767da4)) - Ryan Chang
- no file changes + tag action test - ([6317377](https://github.com/ryancyq/github-signed-commit/commit/6317377a9409c41a52e1a8f3ebe0d24bb58bce11)) - Ryan Chang
- mock implementation once as the default - ([b95e4d8](https://github.com/ryancyq/github-signed-commit/commit/b95e4d807e49da6948fc53a9d3260f1e1c3a9078)) - Ryan Chang
- add test around branch commit fail to fetch from github - ([ede1388](https://github.com/ryancyq/github-signed-commit/commit/ede13880b65bbd1c570733a6f28321f9022ef802)) - Ryan Chang
- simplify getMultilineInput mock since we are using it for one single type of input - ([396459f](https://github.com/ryancyq/github-signed-commit/commit/396459fd6b1305cb7cd04c4ba1d05170f530047d)) - Ryan Chang
- add git cli stdout and stderr tests - ([30e9d2a](https://github.com/ryancyq/github-signed-commit/commit/30e9d2a110b4a1db98993c17c2024790353914b0)) - Ryan Chang
- add file/stream errors test for blob - ([5251c8e](https://github.com/ryancyq/github-signed-commit/commit/5251c8e933455262dbe7dcaea72fafe603c1eec2)) - Ryan Chang

### Burn

- remove commit type check - ([b4430a0](https://github.com/ryancyq/github-signed-commit/commit/b4430a04623f4769544a881d4d2268b3bb27e17d)) - Ryan Chang

---
## [1.0.3](https://github.com/ryancyq/github-signed-commit/compare/v1.0.2..v1.0.3) - 2024-08-29

---
## [1.0.2](https://github.com/ryancyq/github-signed-commit/compare/v1.0.1..v1.0.2) - 2024-08-28

---
## [1.0.1](https://github.com/ryancyq/github-signed-commit/compare/v1.0.0..v1.0.1) - 2024-08-28

<!-- generated by git-cliff -->
