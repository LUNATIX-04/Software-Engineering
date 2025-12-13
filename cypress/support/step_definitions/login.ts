import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'

Given('I visit the home page', () => {
  cy.visit('/')
})

When('I click the get start button', () => {
  cy.get('[data-cy="get-started"]').click();
})

Then('I should see the login page', () => {
  cy.url().should('include', '/auth/traditional');
})



Given('I am on the login page', () => {
  cy.visit('/auth/traditional');
});

When('I enter email {string} and password {string}', (email: string, password: string) => {
  cy.get('[data-cy="auth-email-input"]').type(email);
  cy.get('[data-cy="auth-password-input"]').type(password);
});

When('I click the login button', () => {
  cy.get('[data-cy="auth-submit"]').click();
});

Then('I should be redirected to the projects page', () => {
  cy.url().should('include', '/projects');
});

Then('I see Create Project button', () => {
  cy.get('[data-cy="create-project-card"]').should('be.visible');
});