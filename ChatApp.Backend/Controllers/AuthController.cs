using ChatApp.Backend.Dtos;
using ChatApp.Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Text.RegularExpressions;

namespace ChatApp.Backend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private const string DefaultProfileColor = "#4f8cff";
    private const string DefaultMascot = "fox";
    private static readonly Regex HexColorRegex = new("^#[0-9A-Fa-f]{6}$", RegexOptions.Compiled);

    private readonly UserManager<Account> _userManager;
    private readonly SignInManager<Account> _signInManager;

    public AuthController(UserManager<Account> userManager, SignInManager<Account> signInManager)
    {
        _userManager = userManager;
        _signInManager = signInManager;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest("Username and password are required.");

        var user = new Account
        {
            UserName = request.UserName.Trim(),
            ProfileColor = NormalizeProfileColor(request.ProfileColor),
            Mascot = NormalizeMascot(request.Mascot)
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                errors = result.Errors.Select(error => error.Description)
            });
        }

        await _signInManager.SignInAsync(user, isPersistent: false);
        return Ok(ToResponse(user));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest("Username and password are required.");

        var user = await _userManager.FindByNameAsync(request.UserName.Trim());
        if (user == null)
            return Unauthorized("Invalid username or password.");

        var result = await _signInManager.PasswordSignInAsync(user, request.Password, isPersistent: false, lockoutOnFailure: false);
        if (!result.Succeeded)
            return Unauthorized("Invalid username or password.");

        return Ok(ToResponse(user));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await _signInManager.SignOutAsync();
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
            return Unauthorized();

        return Ok(ToResponse(user));
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile(ProfileUpdateRequest request)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
            return Unauthorized();

        user.ProfileColor = NormalizeProfileColor(request.ProfileColor);
        user.Mascot = NormalizeMascot(request.Mascot);

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                errors = result.Errors.Select(error => error.Description)
            });
        }

        return Ok(ToResponse(user));
    }

    private static object ToResponse(Account user)
    {
        return new
        {
            user.Id,
            user.UserName,
            user.ProfileColor,
            user.Mascot
        };
    }

    private static string NormalizeProfileColor(string? color)
    {
        if (string.IsNullOrWhiteSpace(color))
            return DefaultProfileColor;

        var trimmed = color.Trim();
        return HexColorRegex.IsMatch(trimmed) ? trimmed.ToLowerInvariant() : DefaultProfileColor;
    }

    private static string NormalizeMascot(string? mascot)
    {
        if (string.IsNullOrWhiteSpace(mascot))
            return DefaultMascot;

        var trimmed = mascot.Trim().ToLowerInvariant();
        return trimmed.Length > 32 ? trimmed[..32] : trimmed;
    }
}
