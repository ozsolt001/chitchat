namespace ChatApp.Backend.Dtos;

public record RegisterRequest(string UserName, string Password, string? ProfileColor, string? Mascot);
