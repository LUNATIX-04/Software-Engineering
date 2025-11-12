Feature: project management

    Scenario: Create a new project
        Given I am logged in as a user
        When I navigate to the projects page
        And I click the "Create Project" button
        And I fill in the project details with name "Helicopter 01" description "bamboo copter" and department "Aerospace{enter}"
        And I submit the project creation form
        Then I should see the new project on the projects page

    Scenario: View project information
        Given I am logged in as a user
        When I navigate to the projects page
        And I should see a list of my existing projects
        And I click on a project name "For Test"
        Then I should see the project details page with correct information

    Scenario: view project members
        Given I am logged in as a user
        When I navigate to the projects page
        And I click on a project name "For Test"
        And I navigate to the "Members" tab
        Then I should see a list of project "members"

    Scenario: Add members to a project
        Given I am logged in as a user
        When I navigate to the projects page
        And I click on a project name "For Test"
        And I navigate to the "Members" tab
        And I click the "Invite Link" button
        And I select "Link expiry" as "5 minutes"
        And I select "Invite role" as "Header"
        And I select "Department" as "OS"
        And I click the "Generate link" button
        Then I should see a generated invite link for the project

    Scenario: Change department for member in a project
        Given I am logged in as a user
        When I navigate to the projects page
        And I click on a project name "For Test"
        And I navigate to the "Members" tab
        And I change the department for members form "OS" to "CPE"
        Then I should see the updated department for the members

    Scenario: view project department
        Given I am logged in as a user
        When I navigate to the projects page
        And I click on a project name "For Test"
        And I navigate to the "Departments" tab
        Then I should see a list of project "departments"

    Scenario: View project task
        Given I am logged in as a user
        When I navigate to the projects page
        And I click on a project name "For Test"
        And I navigate to the "Tasks" tab
        Then I should see a list of project "tasks"

    # Scenario: View project calendar
    #     Given I am logged in as a user
    #     When I navigate to the projects page
    #     And I click on a project name "For Test"
    #     And I navigate to the "Calendar" tab
    #     Then I should see a list of project "calendar"

    Scenario: Edit an existing project
        Given I am logged in as a user
        When I navigate to the projects page
        And I should see a list of my existing projects
        And I click more horizontal button for a specific project
        And I click the Edit button
        And I update the project details to name "Helicopter 02" description "helicopter" and department "Vehicle{enter}"
        And I submit the project edit form
        Then I should see the updated project "Helicopter 02" and details on the projects page

    Scenario: Delete a project
        Given I am logged in as a user
        When I navigate to the projects page
        And I should see a list of my existing projects
        And I click more horizontal button for a specific project
        And I click the Delete button
        And I confirm the deletion in the confirmation dialog
        Then I should not see the deleted project on the projects page
