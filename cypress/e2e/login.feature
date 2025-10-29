Feature: Login

  Scenario: Successful login
    Given I visit the home page
    When I click the get start button
    Then I should see the login page
    When I fill in the username and password
    And I click the login button
    Then I should see the projects page