<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, SoftDeletes;

    public const ROLE_SUPER_ADMIN = 'SUPER_ADMIN';
    public const ROLE_ADMIN = 'ADMIN';
    public const ROLE_PROJECT_LEADER = 'PROJECT_LEADER';
    public const ROLE_USER = 'USER';
    public const ROLES = [
        self::ROLE_SUPER_ADMIN,
        self::ROLE_ADMIN,
        self::ROLE_PROJECT_LEADER,
        self::ROLE_USER,
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (User $user) {
            $currentUser = auth()->user();

            if (!$currentUser) {
                return;
            }

            if (!$currentUser->canManageRole($user->rol)) {
                $user->rol = self::ROLE_USER;
            }
        });

        static::updating(function (User $user) {
            if (!$user->isDirty('rol')) {
                return;
            }

            $currentUser = auth()->user();

            if (!$currentUser) {
                $user->rol = $user->getOriginal('rol');
                return;
            }

            if (!$currentUser->canManageRole($user->rol)) {
                $user->rol = $user->getOriginal('rol');
            }
        });
    }

    protected $fillable = [
        'name',
        'email',
        'password',
        'rol',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function perfil(): HasOne
    {
        return $this->hasOne(Perfil::class);
    }

    public function ledProjects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'project_user_leaders')->withTimestamps();
    }

    public function isAdmin(): bool
    {
        return $this->rol === self::ROLE_ADMIN;
    }

    public function isSuperAdmin(): bool
    {
        return $this->rol === self::ROLE_SUPER_ADMIN;
    }

    public function isProjectLeader(): bool
    {
        return $this->rol === self::ROLE_PROJECT_LEADER;
    }

    public function canManageUsers(): bool
    {
        return in_array($this->rol, [self::ROLE_SUPER_ADMIN, self::ROLE_ADMIN], true);
    }

    public function canManageRole(string $role): bool
    {
        if ($this->isSuperAdmin()) {
            return in_array($role, self::ROLES, true);
        }

        return $this->isAdmin() && in_array($role, [self::ROLE_PROJECT_LEADER, self::ROLE_USER], true);
    }

    public function canManageProjects(): bool
    {
        return in_array($this->rol, [self::ROLE_SUPER_ADMIN, self::ROLE_ADMIN], true);
    }

    public function leadsProject(?string $projectId): bool
    {
        if (!$projectId || !$this->isProjectLeader()) {
            return false;
        }

        return $this->ledProjects()->whereKey($projectId)->exists();
    }

    public function isUser(): bool
    {
        return $this->rol === self::ROLE_USER;
    }

    public function hasRole(string $role): bool
    {
        return $this->rol === $role;
    }

    public function isActive(): bool
    {
        return $this->is_active;
    }

    public function activate(): void
    {
        $this->is_active = true;
        $this->save();
    }

    public function deactivate(): void
    {
        $this->is_active = false;
        $this->save();
    }
}
