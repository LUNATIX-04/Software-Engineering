import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'

Given('I visit the home page', () => {
  cy.visit('/')
})