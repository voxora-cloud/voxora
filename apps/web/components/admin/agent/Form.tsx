import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Agent, Team } from "@/lib/api"
import { AgentFormData, TeamFormData } from "../admin-dashboard"
import { useState } from "react"
// Agent Form Component
function AgentForm({ agent = null, teams, onSubmit, onCancel, isLoading = false }: {
  agent?: Agent | null
  teams: Team[]
  onSubmit: (data: AgentFormData) => void
  onCancel: () => void
  isLoading?: boolean
}) {
  const [formData, setFormData] = useState<AgentFormData>({
    name: agent?.name || '',
    email: agent?.email || '',
    role: agent?.role || 'agent',
    teamIds: agent?.teams?.map(t => t.id) || []
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const toggleTeam = (teamId: string) => {
    setFormData(prev => ({
      ...prev,
      teamIds: prev.teamIds.includes(teamId)
        ? prev.teamIds.filter(id => id !== teamId)
        : [...prev.teamIds, teamId]
    }))
  }


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Agent Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter agent name"
          required
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Enter agent email"
          required
          disabled={!!agent} // Disable email editing for existing agents
        />
      </div>
      <div>
        <Label>Teams</Label>
        <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
          {teams.map((team) => (
            <label key={team.id} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.teamIds.includes(team.id)}
                onChange={() => toggleTeam(team.id)}
                className="rounded"
              />
              <span className="text-sm">{team.name}</span>
            </label>
          ))}
        </div>
      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-white mr-2"></div>
              {agent ? 'Updating...' : 'Inviting...'}
            </>
          ) : (
            agent ? 'Update Agent' : 'Invite Agent'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1" disabled={isLoading}>
          Cancel
        </Button>
      </div>
      </div>
    </form>
  )

}

export default AgentForm