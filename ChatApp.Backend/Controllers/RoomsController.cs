using System.Security.Claims;
using ChatApp.Backend.Data;
using ChatApp.Backend.Dtos;
using ChatApp.Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.Backend.Controllers;

[ApiController]
[Authorize]
[Route("api/rooms")]
public class RoomsController : ControllerBase
{
    private readonly ChatDbContext _db;
    private readonly ILogger<RoomsController> _logger;

    public RoomsController(ChatDbContext db, ILogger<RoomsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // 0️⃣ Szobák listázása
    [HttpGet]
    public async Task<IActionResult> GetRooms()
    {
        var rooms = await _db.Rooms
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.IsPrivate,
                MemberCount = r.Members.Count
            })
            .ToListAsync();

        return Ok(rooms);
    }

    // 1️⃣ Szoba létrehozása
    [HttpPost]
    public async Task<IActionResult> CreateRoom(CreateRoomRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Room name is required");

        var accountId = GetCurrentAccountId();
        if (accountId == null)
            return Unauthorized();

        var room = new Room
        {
            Name = request.Name.Trim(),
            IsPrivate = request.IsPrivate
        };

        _db.Rooms.Add(room);
        await _db.SaveChangesAsync();

        var membership = new RoomMember
        {
            RoomId = room.Id,
            Role = RoomRole.Admin,
            AccountId = accountId.Value
        };

        _db.RoomMembers.Add(membership);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            room.Id,
            room.Name,
            room.IsPrivate
        });
    }

    //2️⃣ Belépés szobába
    [HttpPost("{roomId}/join")]
    public async Task<IActionResult> JoinRoom(int roomId)
    {
        var accountId = GetCurrentAccountId();
        if (accountId == null)
            return Unauthorized();

        _logger.LogInformation("JoinRoom called with roomId={RoomId}, accountId={AccountId}", roomId, accountId.Value);

        var account = await _db.Users.FindAsync(accountId.Value);
        if (account == null)
        {
            _logger.LogWarning("Account not found: {AccountId}", accountId.Value);
            return NotFound("Account not found");
        }

        var room = await _db.Rooms.FindAsync(roomId);
        if (room == null)
        {
            _logger.LogWarning("Room not found: {RoomId}", roomId);
            return NotFound("Room not found");
        }

        var member = await _db.RoomMembers.AnyAsync(rm =>
            rm.AccountId == accountId.Value &&
            rm.RoomId == roomId);

        //It should let you enter the room if you are already a member
        //Only public rooms exist, so we don't need to check for that

        if (member)
        {
            _logger.LogWarning("Account {AccountId} already member of room {RoomId}", accountId.Value, roomId);
            return Ok("Already a member of this room");
        }

        var membership = new RoomMember
        {
            AccountId = accountId.Value,
            RoomId = roomId,
            Role = RoomRole.Member
        };

        _db.RoomMembers.Add(membership);
        await _db.SaveChangesAsync();
        
        _logger.LogInformation("Account {AccountId} successfully joined room {RoomId}", accountId.Value, roomId);

        return Ok("Joined room");
    }

    [HttpDelete("{roomId}")]
    public async Task<IActionResult> DeleteRoom(int roomId)
    {
        var accountId = GetCurrentAccountId();
        if (accountId == null)
            return Unauthorized();

        _logger.LogInformation("DeleteRoom called with roomId={RoomId}, accountId={AccountId}", roomId, accountId.Value);

        var room = await _db.Rooms.FindAsync(roomId);
        if (room == null)
        {
            _logger.LogWarning("Room not found: {RoomId}", roomId);
            return NotFound("Room not found");
        }

        var isAdmin = await _db.RoomMembers.AnyAsync(rm =>
            rm.RoomId == roomId &&
            rm.AccountId == accountId.Value &&
            rm.Role == RoomRole.Admin);

        if (!isAdmin)
        {
            _logger.LogWarning("Account {AccountId} is not allowed to delete room {RoomId}", accountId.Value, roomId);
            return StatusCode(StatusCodes.Status403Forbidden, "Only room admins can delete rooms");
        }

        var roomMessages = await _db.ChatMessages
            .Where(message => message.RoomId == roomId)
            .ToListAsync();

        var roomMembers = await _db.RoomMembers
            .Where(member => member.RoomId == roomId)
            .ToListAsync();

        _db.ChatMessages.RemoveRange(roomMessages);
        _db.RoomMembers.RemoveRange(roomMembers);
        _db.Rooms.Remove(room);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Room {RoomId} deleted by account {AccountId}", roomId, accountId.Value);

        return Ok("Room deleted");
    }

    private int? GetCurrentAccountId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out var accountId) ? accountId : null;
    }
}
