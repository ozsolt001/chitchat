using ChatApp.Backend.Data;
using ChatApp.Backend.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.Backend.Controllers;

[ApiController]
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
            AccountId = request.CreatorAccountId
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
    public async Task<IActionResult> JoinRoom(int roomId, JoinRoomRequest request)
    {
        _logger.LogInformation("JoinRoom called with roomId={RoomId}, accountId={AccountId}", roomId, request.AccountId);

        var account = await _db.Accounts.FindAsync(request.AccountId);
        if (account == null)
        {
            _logger.LogWarning("Account not found: {AccountId}", request.AccountId);
            return NotFound("Account not found");
        }

        var room = await _db.Rooms.FindAsync(roomId);
        if (room == null)
        {
            _logger.LogWarning("Room not found: {RoomId}", roomId);
            return NotFound("Room not found");
        }

        var member = await _db.RoomMembers.AnyAsync(rm =>
            rm.AccountId == request.AccountId &&
            rm.RoomId == roomId);

        //It should let you enter the room if you are already a member
        //Only public rooms exist, so we don't need to check for that

        if (member)
        {
            _logger.LogWarning("Account {AccountId} already member of room {RoomId}", request.AccountId, roomId);
            return Ok("Already a member of this room");
        }

        var membership = new RoomMember
        {
            AccountId = request.AccountId,
            RoomId = roomId,
            Role = RoomRole.Member
        };

        _db.RoomMembers.Add(membership);
        await _db.SaveChangesAsync();
        
        _logger.LogInformation("Account {AccountId} successfully joined room {RoomId}", request.AccountId, roomId);

        return Ok("Joined room");
    }
}
