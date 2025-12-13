/// <reference types="cypress" />

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.get('[data-cy="get-started"]').click();
  cy.get('[data-cy="auth-email-input"]').type(email);
  cy.get('[data-cy="auth-password-input"]').type(password);
  cy.get('[data-cy="auth-submit"]').click();
});
