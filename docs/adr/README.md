# Architecture Decision Records

Short records of significant decisions: the context, the decision and its consequences.
ADRs are immutable once accepted. To change a decision, add a new ADR that supersedes it.

| ADR                                              | Title                                                     | Status                                     |
| ------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------ |
| [0001](0001-monorepo-with-npm-and-turborepo.md)  | Monorepo with npm workspaces and Turborepo                | Accepted (partly superseded by 0008, 0010) |
| [0002](0002-shared-zod-contracts.md)             | Shared Zod contracts between web and api                  | Accepted                                   |
| [0003](0003-prisma-orm.md)                       | Prisma as the ORM                                         | Superseded by 0009                         |
| [0004](0004-monochrome-design-system.md)         | Monochrome design system on shadcn/ui                     | Accepted                                   |
| [0005](0005-authentication-with-better-auth.md)  | Authentication with Better Auth                           | Accepted                                   |
| [0006](0006-configurable-catalog.md)             | A configurable catalog                                    | Accepted                                   |
| [0007](0007-media-storage.md)                    | Media storage behind a driver, served from the web origin | Accepted                                   |
| [0008](0008-flat-workspace-layout.md)            | Flat workspace layout                                     | Accepted                                   |
| [0009](0009-drizzle-orm.md)                      | Drizzle as the ORM                                        | Accepted                                   |
| [0010](0010-npm-scripts-instead-of-turborepo.md) | Plain npm scripts instead of Turborepo                    | Accepted                                   |

New ADRs copy [template.md](template.md) and take the next number.
