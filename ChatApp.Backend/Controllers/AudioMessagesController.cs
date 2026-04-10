using System.Security.Claims;
using ChatApp.Backend.Data;
using ChatApp.Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.Backend.Controllers;

[ApiController]
[Authorize]
[Route("api/audio-messages")]
public class AudioMessagesController : ControllerBase
{
    private static readonly string[] AllowedMimeTypePrefixes =
    {
        "audio/webm",
        "audio/ogg",
        "audio/mp4",
        "audio/mpeg"
    };

    private const long MaxAudioBytes = 10 * 1024 * 1024;

    private readonly ChatDbContext _db;
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly IWebHostEnvironment _environment;

    public AudioMessagesController(ChatDbContext db, IHubContext<ChatHub> hubContext, IWebHostEnvironment environment)
    {
        _db = db;
        _hubContext = hubContext;
        _environment = environment;
    }

    [HttpPost]
    [RequestSizeLimit(MaxAudioBytes)]
    public async Task<IActionResult> Upload([FromForm] int roomId, [FromForm] int? durationMs, [FromForm] IFormFile? audio)
    {
        var accountId = GetCurrentAccountId();
        if (accountId == null)
            return Unauthorized();

        if (roomId <= 0)
            return BadRequest("Valid roomId is required.");

        if (audio == null || audio.Length == 0)
            return BadRequest("Audio file is required.");

        if (audio.Length > MaxAudioBytes)
            return BadRequest("Audio file is too large.");

        if (!IsAllowedAudioContentType(audio.ContentType))
            return BadRequest("Unsupported audio format.");

        var isMember = await _db.RoomMembers.AnyAsync(member => member.RoomId == roomId && member.AccountId == accountId.Value);
        if (!isMember)
            return Forbid();

        var user = await _db.Users.FindAsync(accountId.Value);
        if (user == null)
            return Unauthorized();

        var extension = ResolveExtension(audio.ContentType, audio.FileName);
        var uploadsRoot = Path.Combine(_environment.WebRootPath ?? Path.Combine(AppContext.BaseDirectory, "wwwroot"), "uploads", "audio");
        Directory.CreateDirectory(uploadsRoot);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadsRoot, fileName);

        await using (var stream = System.IO.File.Create(filePath))
        {
            await audio.CopyToAsync(stream);
        }

        var mediaUrl = $"/uploads/audio/{fileName}";
        var chatMessage = new ChatMessage
        {
            User = user.UserName ?? string.Empty,
            AccountId = accountId.Value,
            RoomId = roomId,
            Message = string.Empty,
            MessageType = ChatMessage.AudioType,
            MediaUrl = mediaUrl,
            DurationMs = durationMs > 0 ? durationMs : null
        };

        _db.ChatMessages.Add(chatMessage);
        await _db.SaveChangesAsync();

        var payload = new
        {
            from = chatMessage.User,
            message = chatMessage.Message,
            messageType = chatMessage.MessageType,
            mediaUrl = chatMessage.MediaUrl,
            durationMs = chatMessage.DurationMs,
            sentAt = chatMessage.SentAt
        };

        await _hubContext.Clients.Group(ChatHub.RoomGroupName(roomId))
            .SendAsync("ReceiveMessage", payload);

        return Ok(payload);
    }

    private int? GetCurrentAccountId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out var accountId) ? accountId : null;
    }

    private static bool IsAllowedAudioContentType(string? contentType)
    {
        if (string.IsNullOrWhiteSpace(contentType))
            return true;

        return AllowedMimeTypePrefixes.Any(prefix => contentType.StartsWith(prefix, StringComparison.OrdinalIgnoreCase));
    }

    private static string ResolveExtension(string? contentType, string originalFileName)
    {
        var normalizedContentType = contentType?.Split(';', 2)[0].Trim().ToLowerInvariant();

        return normalizedContentType switch
        {
            "audio/webm" => ".webm",
            "audio/ogg" => ".ogg",
            "audio/mp4" => ".m4a",
            "audio/mpeg" => ".mp3",
            _ => Path.GetExtension(originalFileName) is { Length: > 0 } extension ? extension : ".webm"
        };
    }
}
