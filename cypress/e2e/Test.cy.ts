describe('test', () => {
  it('should display login form', () => {
    cy.visit('/')

  })
});

it('Test2', function() {
  cy.visit('http://localhost:3000')
  cy.get('button.text-button-foreground').click();
  cy.get('[name="email"]').click();
  cy.get('[name="email"]').type('helicop@gmail.com');
  cy.get('[name="password"]').click();
  cy.get('[name="password"]').type('helicop');
  cy.get('button.text-lg').click();
  
});

it('create project', function() {
  cy.visit('http://localhost:3000')
  cy.get('[data-cy="get-started"]').click();
  cy.get('form.space-y-\\[clamp\\(1rem\\,3vh\\,1\\.5rem\\)\\]').click();
  cy.get('[data-cy="auth-email-input"]').click();
  cy.get('[data-cy="auth-email-input"]').type('helicop@gmail.com');
  cy.get('[data-cy="auth-password-input"]').click();
  cy.get('[data-cy="auth-password-input"]').type('helicop');
  cy.get('[data-cy="auth-submit"]').click();
  cy.get('#radix-_r_4_').click();
  cy.get('[data-cy="project-card-menu-edit"]').click();
  cy.get('[data-cy="project-title-input"]').click();
  cy.get('[data-cy="project-title-input"]').type(' helicopter');
  cy.get('[data-cy="project-detail-textarea"]').click();
  cy.get('[data-cy="project-detail-textarea"]').click();
  cy.get('form.rounded-\\[2\\.5rem\\]').click();
  cy.get('[data-cy="project-detail-textarea"]').clear();
  cy.get('[data-cy="project-detail-textarea"]').type('ร่วงแล้ววววววว');
  cy.get('[data-cy="project-department-input"]').click();
  cy.get('[data-cy="project-department-input"]').type('HPE2');
  cy.get('[data-cy="project-submit-button"]').click();
  cy.get('div[data-cy="project-card"]:nth-of-type(1) p.clamp-ellipsis-1').click();
  cy.get('button.text-primary-foreground').click();
  
});

it('Delete Project', function() {
  cy.visit('http://localhost:3000')
  cy.get('button.text-button-foreground').click();
  cy.get('[name="email"]').click();
  cy.get('[name="email"]').type('helicop@gmail.com');
  cy.get('[name="password"]').click();
  cy.get('[name="password"]').clear();
  cy.get('[name="password"]').type('helicop');
  cy.get('button.text-lg').click();
});