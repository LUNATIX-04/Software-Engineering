import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'
let selectedProjectName = '';

// Scenario: Create a new project
Given('I am logged in as a user', () => {
    cy.intercept("GET", "**/api/projects*").as("getProjects")
    cy.intercept("POST", "**/api/projects").as("createProject")
    cy.intercept("PATCH", "**/api/projects/*").as("updateProject")
    cy.intercept("DELETE", "**/api/projects/*").as("deleteProject")
    cy.visit('/')
    cy.login('helicop@gmail.com', 'helicop');
})
When('I navigate to the projects page', () => {
    cy.url().should('include', '/projects');
    cy.wait("@getProjects")
})
When('I click the {string} button', (buttonText: string) => {
  cy.contains('button', buttonText).click();
})
When('I fill in the project details with name {string} description {string} and department {string}', (name: string, description: string, department: string) => {
    cy.get('[data-cy="project-title-input"]').type(name);
    cy.get('[data-cy="project-detail-textarea"]').type(description);
    cy.get('[data-cy="project-department-input"]').type(department);
})
When('I submit the project creation form', () => {
    cy.get('[data-cy="project-submit-button"]').click();
})
Then('I should see the new project on the projects page', () => {
    cy.get('[data-cy="project-card-1"]').should('contain.text','Helicopter 01');
})

// Scenario: View project information
When('I should see a list of my existing projects', () => {
    cy.get('[data-cy^="project-card-"]').should('have.length.greaterThan', 0);
})
When('I click on a project name {string}', (projectName: string) => {
      cy.contains('h3', projectName).invoke('text').then((text) => {
      selectedProjectName = text.trim();
    });
  cy.contains('h3', projectName).click();
});
Then('I should see the project details page with correct information', () => {
    cy.url().should('include', '/projects/')
    cy.get('[data-cy="project-name"]').should('exist').and('have.text', selectedProjectName);
    cy.get('[data-cy="project-description"]').should('exist');
    cy.get('[data-cy="project-department"]').should('exist');
})

// Scenario: view project members
When('I navigate to the {string} tab', (buttonText: string) => {
    cy.contains('button', buttonText).click();
})
Then('I should see a list of project members', () => {
    cy.get('[data-cy^="member-card-"]').should('have.length.greaterThan', 0);
})

//Scenario: Add members to a project
When('I select {string} as {string}', (dropdownLabel: string, userSelect: string) => {
  cy.intercept('GET', '/api/projects/*/invites').as('getProjectInvites');
  cy.contains('label', dropdownLabel).parent().within(() => {
    if (dropdownLabel.includes('Generate')) {
        cy.get('[data-cy="project-invite-generate-link"]').click();
      } else if (dropdownLabel.includes('expiry')) {
        cy.get('[data-cy="project-invite-expiry-trigger"]').click();
      } else {
        cy.get('[data-cy^="project-invite-"]').click();
      }
    });
  cy.contains(userSelect).click();
  cy.contains('h2', 'Invite teammates').click();
});
Then('I should see a generated invite link for the project', () => {
    cy.wait('@getProjectInvites');
    cy.get('[data-cy^="project-invite-row-"]').should('exist');
})

// Scenario: Edit an existing project
When('I click more horizontal button for a specific project', () => {
    cy.get('[data-cy="project-card-menu-button-1"]').click();
})
// When('I click the Edit button', () => {
//     cy.get('[data-cy="project-card-menu-edit-1"]').click();
// })
When('I update the project details to name {string} description {string} and department {string}', (name: string, description: string, department: string) => {
    cy.get('[data-cy="project-title-input"]').clear().type(name);
    cy.get('[data-cy="project-detail-textarea"]').clear().type(description);
    cy.get('[data-cy="project-department-remove"]').click;
    cy.get('[data-cy="project-department-input"]').type(department);
})
When('I submit the project edit form', () => {
    cy.get('[data-cy="project-submit-button"]').click();
})
Then('I should see the updated project {string} and details on the projects page', (name: string) => {
    cy.get('[data-cy="project-card-1"]').should('contain.text', 'Helicopter 02');
})

// Scenario: Delete a project
// When('I click the Delete button', () => {
//     cy.get('[data-cy="project-card-menu-delete-1"]').click();
// })
When('I confirm the deletion in the confirmation dialog', () => {
    cy.get('[data-cy="project-delete-confirm-1"]').click();
})
Then('I should not see the deleted project on the projects page', () => {
    cy.get('[data-cy="project-card-1"]').should('not.exist');
})
