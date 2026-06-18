<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Form extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'title',
        'description',
        'user_id',
        'state',
        'link_uuid'
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function questions()
    {
        return $this->hasMany(FormQuestion::class)->orderBy('order', 'asc');
    }

    public function responses()
    {
        return $this->hasMany(FormResponse::class);
    }

    public function shares()
    {
        return $this->hasMany(FormUserShare::class);
    }
}
