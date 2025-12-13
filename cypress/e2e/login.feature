Feature: Login

  Scenario: Go to login page
    Given I visit the home page
    When I click the get start button
    Then I should see the login page

  Scenario: Successful login
    Given I am on the login page
    When I enter email "helicop@gmail.com" and password "helicop"
    And I click the login button
    Then I should be redirected to the projects page
    And I see Create Project button
