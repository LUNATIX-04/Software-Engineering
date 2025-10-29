import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'

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

When('I click the "Create Project" button', () => {
    cy.get('[data-cy="create-project-card"]').click();
})

When('I fill in the project details with name {string} description {string} and department {string}', (name: string, description: string, department: string) => {
    cy.get('[data-cy="project-title-input"]').type(name);
    cy.get('[data-cy="project-detail-textarea"]').type(description);
    cy.get('[data-cy="project-department-input"]').type(department);
})

When('I submit the project creation form', () => {
    cy.get('[data-cy="project-submit-button"]').click();
    cy.wait("@createProject").its("response.statusCode").should("eq", 200)
})

Then('I should see the new project on the projects page', () => {
    cy.get('[data-cy="project-card-0"]').should('contain.text','Helicopter 01');
})

// Scenario: View project details
When('I should see a list of my existing projects', () => {
    cy.get('[data-cy="project-card-0"]').should('exist');
})
When('I click on a specific project', () => {
    cy.get('[data-cy="project-card-0"]').click();
})
Then('I should see the project details page with correct information', () => {
    cy.url().should('include', '/projects/')
    cy.get('[data-cy="project-name"]').should('have.text', 'Helicopter 01');
    cy.get('[data-cy="project-description"]').should('exist');
    cy.get('[data-cy="project-department"]').should('exist');
})

// Scenario: Edit an existing project
When('I click more horizontal button for a specific project', () => {
    cy.get('[data-cy="project-card-menu-button-0"]').click();
})

When('I click the "Edit" button', () => {
    cy.get('[data-cy="project-card-menu-edit-0"]').click();
})

When('I update the project details to name {string} description {string} and department {string}', (name: string, description: string, department: string) => {
    cy.get('[data-cy="project-title-input"]').clear().type(name);
    cy.get('[data-cy="project-detail-textarea"]').clear().type(description);
    cy.get('[data-cy="project-department-remove"]').click;
    cy.get('[data-cy="project-department-input"]').type(department);
})

When('I submit the project edit form', () => {
    
    cy.get('[data-cy="project-submit-button"]').click();
    cy.wait("@updateProject").its("response.statusCode").should("eq", 200)
})

Then('I should see the updated project {string} and details on the projects page', (name: string) => {
    cy.get('[data-cy="project-card-0"]').should('contain.text', 'Helicopter 02');
})

// Scenario: Delete a project
When('I click the "Delete" button', () => {
    cy.get('[data-cy="project-card-menu-delete-0"]').click();
})

When('I confirm the deletion in the confirmation dialog', () => {
    cy.get('[data-cy="project-delete-confirm-0"]').click();
    cy.wait("@deleteProject").its("response.statusCode").should("eq", 200)
})

Then('I should not see the deleted project on the projects page', () => {
    cy.get('[data-cy="project-card-0"]').should('not.exist');
})