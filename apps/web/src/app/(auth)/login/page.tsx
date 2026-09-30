export default function LoginPage() {
  return (
    <main>
      <h1>Entrar</h1>
      <p>Receba um link seguro de acesso no seu e-mail.</p>
      <form method="post" action="/api/auth/request-link">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <button type="submit">Enviar link de acesso</button>
      </form>
    </main>
  );
}
