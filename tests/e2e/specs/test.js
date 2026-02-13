// https://docs.cypress.io/api/introduction/api.html

describe('Neptune GUI', () => {
  it('Visits the app root url (Landing)', () => {
    cy.visit('/')
    cy.get('#login').should('exist')
  })

  it('Landing page shows Neptune branding', () => {
    cy.visit('/')
    cy.get('img[src*="Neptune"]').should('exist')
  })
})
