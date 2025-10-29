Feature: project management

    Scenario: Create a new project
        Given I am logged in as a user
        When I navigate to the projects page
        And I click the "Create Project" button
        And I fill in the project details with name "Helicopter 01" description "bamboo copter" and department "Aerospace{enter}"
        And I submit the project creation form
        Then I should see the new project on the projects page

    Scenario: View project details
        Given I am logged in as a user
        When I navigate to the projects page
        And I should see a list of my existing projects
        And I click on a specific project
        Then I should see the project details page with correct information

    Scenario: Edit an existing project
        Given I am logged in as a user
        When I navigate to the projects page
        And I should see a list of my existing projects
        And I click more horizontal button for a specific project
        And I click the "Edit" button
        And I update the project details to name "Helicopter 02" description "helicopter" and department "Vehicle{enter}"
        And I submit the project edit form
        Then I should see the updated project "Helicopter 02" and details on the projects page

    Scenario: Delete a project
        Given I am logged in as a user
        When I navigate to the projects page
        And I should see a list of my existing projects
        And I click more horizontal button for a specific project
        And I click the "Delete" button
        And I confirm the deletion in the confirmation dialog
        Then I should not see the deleted project on the projects page
