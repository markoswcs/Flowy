export function getAuthErrorMessage(message?: string): string {
  if (!message) return "Não foi possível concluir esta ação. Tente novamente.";

  const lower = message.toLowerCase();

  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials") ||
    lower.includes("invalid_grant")
  ) {
    return "E-mail ou senha incorretos.";
  }

  if (
    lower.includes("email not confirmed") ||
    lower.includes("email_not_confirmed")
  ) {
    return "Confirme seu e-mail acessando o link enviado para sua caixa de entrada antes de entrar.";
  }

  if (
    lower.includes("user already registered") ||
    lower.includes("already registered") ||
    lower.includes("already exists") ||
    lower.includes("user_already_exists")
  ) {
    return "Já existe uma conta cadastrada com este e-mail. Faça login ou recupere a senha.";
  }

  if (
    lower.includes("email signups are disabled") ||
    lower.includes("email provider is disabled")
  ) {
    return "O cadastro por e-mail ainda não está habilitado. Ative o provedor Email no Supabase.";
  }

  if (
    (lower.includes("email address") && lower.includes("invalid")) ||
    lower.includes("email_address_invalid") ||
    lower.includes("invalid email") ||
    lower.includes("unable to validate email")
  ) {
    return "Informe um e-mail válido (exemplo: usuario@gmail.com). Domínios de teste (como @example.com) não são aceitos.";
  }

  if (
    lower.includes("password") &&
    (lower.includes("least") ||
      lower.includes("short") ||
      lower.includes("weak"))
  ) {
    return "A senha precisa ter pelo menos 8 caracteres.";
  }

  if (
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("over_email_send_rate_limit")
  ) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }

  if (lower.includes("auth session missing")) {
    return "Sua sessão expirou. Solicite um novo link.";
  }

  if (lower.includes("new password should be different")) {
    return "A nova senha precisa ser diferente da anterior.";
  }

  return "Não foi possível concluir esta ação. Tente novamente.";
}
