using ChatApp.Backend.Data;
using ChatApp.Backend.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/accounts")]
public class AccountsController : ControllerBase
{
    private readonly ChatDbContext _db;

    public AccountsController(ChatDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    public async Task<IActionResult> CreateAccount(CreateAccountRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName))
            return BadRequest("Username is required");

        var exists = await _db.Accounts
            .AnyAsync(a => a.UserName == request.UserName);

        if (exists)
            return Conflict("Username already exists");

        var account = new Account
        {
            UserName = request.UserName.Trim()
        };

        _db.Accounts.Add(account);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            account.Id,
            account.UserName
        });
    }
}
