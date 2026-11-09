# CHANGELOG

## 1.5.1

This release has 1 fix and 4 documentation changes. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Fixed

- **deps:** clear the glob cancellation advisory

### Documentation

- **changelog:** regroup the published release notes for readers
- explain how to run the command on mobile
- make issue attachments optional and strongly encouraged
- link to the Obsidian resources page

## 1.5.0

This release has 1 new feature, 3 fixes and 4 documentation changes. 5 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### New

- add a Report a bug command

### Fixed

- **insert:** save every attachment by the note the command ran from, even after a note switch mid-save
- **insert:** keep the insertion point through edits made while attachments are saved
- **insert:** give the cursor back to the editor once the file picker closes

### Documentation

- **readme:** point bug reports at the Report a bug command
- add issue-filing instructions for AI agents
- **readme:** combine related resources and plugin comparisons
- **readme:** add a Similar plugins section

## 1.4.8

This release has 1 fix and 7 documentation changes. 7 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Fixed

- **demo-vault:** load the demo setup helpers from @mnaoumov/obsidian-lib

### Documentation

- name `obsidian-lib` where comments said dev-utils
- drop a leftover `obsidian-dev-utils` version clause
- shorten the debugging section
- **readme:** lead the Debugging section with `Advanced Debug Mode`
- mark plugin names as code
- **demo-vault:** make the Try it walkthrough runnable from code buttons
- mark plugin names as code in prose and comments

## 1.4.7

This release has 7 fixes and 5 documentation changes. 14 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Fixed

- **screenshots:** merge the clipboard-independent desktop editor-menu frame
- **screenshots:** merge the repeatable mobile command-palette frame
- **test:** merge the headless demo-vault toolkit install
- **deps:** restore the lockfile's missing resolved and integrity fields
- **deps:** float devalue to 5.9.4, clearing GHSA-9rgm-9g3h-6x36
- **deps:** move to `obsidian-integration-testing` 12 and `obsidian-dev-utils` 101
- **build:** wire build:compile to buildCompile and drop the duplicate leaf script

### Documentation

- replace the private rule-id citations with what they assert
- name the library and the sibling plugins so a reader can resolve them
- replace the private tracker references with what they pointed at
- say where the debug command is run
- name the unversioned demo-vault asset and the folder it unzips into

## 1.4.6

This release has 2 fixes and 1 documentation change. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### Fixed

- **deps:** move to `obsidian-integration-testing` 11 and `obsidian-dev-utils` 96.5.2
- **deps:** drop the brace-expansion file: override that breaks a clean install

### Documentation

- point plugin-directory links at community.obsidian.md

## 1.4.5

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 1.4.4

This release has 1 fix and 5 documentation changes. 6 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Fixed

- override deepmerge-ts to clear GHSA-ggr8-5vv4-36mx

### Documentation

- **demo-vault:** unwrap the notes so Obsidian stops rendering a break per line
- **readme:** render the same in Obsidian's plugin page as on `GitHub`
- capture the mobile screenshot set for insert-multiple-attachments
- **demo-vault:** give the demo vault its code buttons
- capture the community-store screenshot set

## 1.4.3

This release has 1 new feature and 1 documentation change.

### New

- **demo-vault:** migrate to `obsidian-dev-utils` 93.3.1 and adopt the authoring convention

### Documentation

- make the demo vault the documentation, in the standard layout

## 1.4.2

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 1.4.1

This release has maintenance changes only. 4 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

## 1.4.0

This release has 1 documentation change. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Documentation

- fix the demo vault download instructions

## 1.3.17

This release has 1 new feature. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### New

- \[FR\] `Insert Multiple Attachments` from Ribbon (#8)

## 1.3.16

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 1.3.15

This release has 1 fix. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Fixed

- **demo-vault:** export invoke() from startup script; add Invocables folder

## 1.3.14

This release has 5 documentation changes. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### Documentation

- standardize demo-vault README
- drop per-plugin demo-vault setup notes (bootstrap covered by the `obsidian-dev-utils` harness)
- **demo-vault:** create the `Insert Multiple Attachments` demo vault
- update
- migrate to AGENTS.md

## 1.3.13

This release has maintenance changes only. 6 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

## 1.3.12

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 1.3.11

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 1.3.10

This release has maintenance changes only. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

## 1.3.9

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 1.3.8

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 1.3.7

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 1.3.6

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 1.3.5

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 1.3.4

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 1.3.3

This release has 1 fix. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### Fixed

- ensure embeds re #6

## 1.3.2

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 1.3.1

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 1.3.0

This release has 1 new feature.

### New

- configure delimiters

## 1.2.17

This release has 1 fix. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### Fixed

- build

## 1.2.16

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 1.2.15

This release has 1 other change.

### Other changes

- Minor changes

## 1.2.14

This release has 1 other change.

### Other changes

- Minor changes

## 1.2.13

This release has 1 other change.

### Other changes

- Minor changes

## 1.2.12

This release has 1 other change.

### Other changes

- Minor changes

## 1.2.11

This release has 1 other change.

### Other changes

- Minor changes

## 1.2.10

This release has 1 other change.

### Other changes

- Minor changes

## 1.2.9

This release has 1 other change.

### Other changes

- Minor changes

## 1.2.8

This release has 1 other change.

### Other changes

- Minor changes

## 1.2.7

This release has 1 other change.

### Other changes

- Minor changes

## 1.2.6

This release has 1 other change.

### Other changes

- Minor changes

## 1.2.5

This release has 1 other change.

### Other changes

- Minor changes

## 1.2.4

This release has 1 other change.

### Other changes

- window.setTimeout

## 1.2.3

This release has 1 other change.

### Other changes

- Minor changes

## 1.2.2

This release has 1 other change.

### Other changes

- Minor changes

## 1.2.1

This release has 1 other change.

### Other changes

- Minor changes

## 1.2.0

This release has 1 other change.

### Other changes

- Configure double lines between links

## 1.1.17

This release has 1 other change.

### Other changes

- Minor changes

## 1.1.16

This release has 1 other change.

### Other changes

- Minor changes

## 1.1.15

This release has 1 other change.

### Other changes

- Minor changes

## 1.1.14

This release has 1 other change.

### Other changes

- New template

## 1.1.13

This release has 1 other change.

### Other changes

- Minor changes

## 1.1.12

This release has 1 other change.

### Other changes

- Update template

## 1.1.11

This release has 1 other change.

### Other changes

- Fix any type

## 1.1.9

This release has 1 other change.

### Other changes

- Add icon

## 1.1.8

This release has 1 other change.

### Other changes

- Minor changes

## 1.1.7

This release has 1 other change.

### Other changes

- Refactor to SASS

## 1.1.6

This release has 1 other change.

### Other changes

- Minor changes

## 1.1.5

This release has 1 other change.

### Other changes

- Minor changes

## 1.1.4

This release has 1 other change.

### Other changes

- Minor changes

## 1.1.3

This release has 1 other change.

### Other changes

- Minor changes

## 1.1.2

This release has 1 other change.

### Other changes

- Minor changes

## 1.1.1

This release has 1 other change.

### Other changes

- Minor changes

## 1.1.0

This release has 1 other change.

### Other changes

- Switch to a separate command

## 1.0.0

This release has 1 other change.

### Other changes

- Initial release
