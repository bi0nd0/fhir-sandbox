import './style.css'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="app">
    <h1>SMART on FHIR Sandbox</h1>
    <p>
      OAuth interactions, including login and logout, are now served directly by the Node API.
      Visit <code>/oauth2/session</code> on the API host to end an active SMART session or review the
      seeded accounts in <code>data/auth/credentials.json</code>.
    </p>
  </main>
`
