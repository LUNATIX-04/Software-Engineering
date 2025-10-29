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
  cy.get('button.text-button-foreground').click();
  cy.get('[name="email"]').click();
  cy.get('[name="email"]').type('helicop@gmail.com');
  cy.get('[name="password"]').click();
  cy.get('[name="password"]').type('helicop');
  cy.get('button.text-lg').click();
  cy.get('button.flex').click();
  cy.get('input.font-semibold').click();
  cy.get('input.font-semibold').type('Helicopter helicopter');
  cy.get('textarea.flex').click();
  cy.get('textarea.flex').type('บิ้นขึ้นไปฟ้า helicopter ของฉ้านนนนนนนนนนนน');
  cy.get('input.w-full').click();
  cy.get('input.w-full').type('HPE');
  cy.get('button.text-base').click();
  cy.get('h3.clamp-ellipsis-1').click();
  
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
  cy.get('#radix-_r_4_').click();
  cy.contains('button', 'Delete Project').click()
  cy.get('#radix-_r_6_ button.bg-primary').click();
});