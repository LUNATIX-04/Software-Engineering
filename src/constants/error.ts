export const ERROR_MESSAGES = {
  emptyAssignee: {
    title: "Fill in a name first",
    description: "Please type an assignee before adding to the list.",
  },
  emptyDepartment: {
    title: "Fill in a department name",
    description: "Please type a department before adding it to the list.",
  },
} as const

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES
