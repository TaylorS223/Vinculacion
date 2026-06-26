<?php

namespace App\Presentation\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Projects', description: 'Gestion de proyectos y asignacion de lideres')]
class ProjectController extends Controller
{
    #[OA\Get(path: '/projects', summary: 'Listar proyectos visibles', security: [['sanctum' => []]], tags: ['Projects'])]
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Project::with(['leaders:id,name,email,rol', 'creator:id,name,email,rol'])
            ->withCount('forms')
            ->latest();

        if ($user->isProjectLeader()) {
            $query->whereHas('leaders', fn($leaders) => $leaders->where('users.id', $user->id));
        } elseif (!$user->canManageProjects()) {
            return response()->json(['message' => 'No tienes permisos para ver proyectos'], 403);
        }

        return response()->json($query->get());
    }

    #[OA\Post(path: '/projects', summary: 'Crear proyecto', security: [['sanctum' => []]], tags: ['Projects'])]
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->canManageProjects()) {
            return response()->json(['message' => 'No tienes permisos para crear proyectos'], 403);
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'leader_ids' => 'sometimes|array',
            'leader_ids.*' => [
                'integer',
                Rule::exists('users', 'id')->where('rol', User::ROLE_PROJECT_LEADER),
            ],
        ]);

        $project = Project::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'created_by' => $user->id,
        ]);

        if (array_key_exists('leader_ids', $data)) {
            $project->leaders()->sync($data['leader_ids']);
        }

        return response()->json($project->load('leaders:id,name,email,rol'), 201);
    }

    #[OA\Get(path: '/projects/{id}', summary: 'Ver proyecto', security: [['sanctum' => []]], tags: ['Projects'])]
    public function show(Request $request, string $id): JsonResponse
    {
        $project = Project::with(['leaders:id,name,email,rol', 'forms.owner:id,name,email,rol'])->findOrFail($id);
        $user = $request->user();

        if (!$user->canManageProjects() && !$user->leadsProject($project->id)) {
            return response()->json(['message' => 'No tienes permisos para ver este proyecto'], 403);
        }

        return response()->json($project);
    }

    #[OA\Put(path: '/projects/{id}', summary: 'Actualizar proyecto', security: [['sanctum' => []]], tags: ['Projects'])]
    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user->canManageProjects()) {
            return response()->json(['message' => 'No tienes permisos para actualizar proyectos'], 403);
        }

        $project = Project::findOrFail($id);
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'leader_ids' => 'sometimes|array',
            'leader_ids.*' => [
                'integer',
                Rule::exists('users', 'id')->where('rol', User::ROLE_PROJECT_LEADER),
            ],
        ]);

        $project->fill($request->only(['name', 'description']));
        $project->save();

        if (array_key_exists('leader_ids', $data)) {
            $project->leaders()->sync($data['leader_ids']);
        }

        return response()->json($project->load('leaders:id,name,email,rol'));
    }

    #[OA\Delete(path: '/projects/{id}', summary: 'Eliminar proyecto', security: [['sanctum' => []]], tags: ['Projects'])]
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSuperAdmin()) {
            return response()->json(['message' => 'Solo el super admin puede eliminar proyectos'], 403);
        }

        Project::findOrFail($id)->delete();

        return response()->json(null, 204);
    }
}
