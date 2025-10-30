import { useEffect, useState } from 'react'
import { FolderKanban, Plus, Trash2, PlayCircle, Square } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useWorkspace } from '../contexts/WorkspaceContext'

interface ServiceGroup {
  id: string
  workspaceId: string
  name: string
  description?: string
  color: string
  icon: string
  serviceIds?: string[]
}

interface Service {
  id: string
  name: string
  status?: string
}

export default function ServiceGroups() {
  const { activeWorkspace } = useWorkspace()
  const [groups, setGroups] = useState<ServiceGroup[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showManageServices, setShowManageServices] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<ServiceGroup | null>(null)

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: '📦',
  })

  useEffect(() => {
    if (activeWorkspace) {
      fetchGroups()
      fetchServices()
    }
  }, [activeWorkspace])

  const fetchGroups = async () => {
    if (!activeWorkspace) return

    setLoading(true)
    try {
      const response = await axios.get(`/api/groups/${activeWorkspace.id}`)
      setGroups(response.data.groups || [])
    } catch (error) {
      console.error('Error fetching groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchServices = async () => {
    try {
      const response = await axios.get('/api/services')
      setServices(response.data.services || [])
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!activeWorkspace) return

    try {
      await axios.post('/api/groups', {
        workspaceId: activeWorkspace.id,
        ...newGroup,
      })
      toast.success('Group created successfully')
      setShowAddForm(false)
      setNewGroup({ name: '', description: '', color: '#3B82F6', icon: '📦' })
      fetchGroups()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create group')
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Delete this group? Services will not be deleted.')) return

    try {
      await axios.delete(`/api/groups/${groupId}`)
      toast.success('Group deleted')
      fetchGroups()
    } catch (error) {
      toast.error('Failed to delete group')
    }
  }

  const handleStartAll = async (groupId: string) => {
    try {
      const response = await axios.post(`/api/groups/${groupId}/start-all`)
      const { started, failed } = response.data

      if (started.length > 0) {
        toast.success(`Started ${started.length} service(s)`)
      }

      if (failed.length > 0) {
        toast.error(`Failed to start ${failed.length} service(s)`)
      }

      fetchServices()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start services')
    }
  }

  const handleStopAll = async (groupId: string) => {
    try {
      const response = await axios.post(`/api/groups/${groupId}/stop-all`)
      const { stopped, failed } = response.data

      if (stopped.length > 0) {
        toast.success(`Stopped ${stopped.length} service(s)`)
      }

      if (failed.length > 0) {
        toast.error(`Failed to stop ${failed.length} service(s)`)
      }

      fetchServices()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to stop services')
    }
  }

  const handleManageServices = (group: ServiceGroup) => {
    setSelectedGroup(group)
    setShowManageServices(true)
  }

  const handleAddServiceToGroup = async (serviceId: string) => {
    if (!selectedGroup) return

    try {
      await axios.post(`/api/groups/${selectedGroup.id}/services`, { serviceId })
      toast.success('Service added to group')
      fetchGroups()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add service')
    }
  }

  const handleRemoveServiceFromGroup = async (serviceId: string) => {
    if (!selectedGroup) return

    try {
      await axios.delete(`/api/groups/${selectedGroup.id}/services/${serviceId}`)
      toast.success('Service removed from group')
      fetchGroups()
      // Update selected group
      setSelectedGroup(prev =>
        prev ? { ...prev, serviceIds: prev.serviceIds?.filter(id => id !== serviceId) } : null
      )
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove service')
    }
  }

  const isServiceInGroup = (serviceId: string) => {
    return selectedGroup?.serviceIds?.includes(serviceId) || false
  }

  const getServiceName = (serviceId: string) => {
    return services.find(s => s.id === serviceId)?.name || 'Unknown'
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FolderKanban className="w-6 h-6" />
            Service Groups
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Organize services for batch operations
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Group
        </button>
      </div>

      {/* Add Group Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New Group</h2>
          <form onSubmit={handleAddGroup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Name
              </label>
              <input
                type="text"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                placeholder="Backend Services"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                placeholder="All backend microservices"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={newGroup.color}
                  onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon (emoji)
                </label>
                <input
                  type="text"
                  value={newGroup.icon}
                  onChange={(e) => setNewGroup({ ...newGroup, icon: e.target.value })}
                  placeholder="📦"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Group
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Manage Services Modal */}
      {showManageServices && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">
                Manage Services - {selectedGroup.name}
              </h2>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {services.length === 0 ? (
                <p className="text-center text-gray-500">No services available</p>
              ) : (
                <div className="space-y-2">
                  {services.map((service) => {
                    const inGroup = isServiceInGroup(service.id)
                    return (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              service.status === 'running' ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          />
                          <span className="font-medium">{service.name}</span>
                        </div>
                        <button
                          onClick={() =>
                            inGroup
                              ? handleRemoveServiceFromGroup(service.id)
                              : handleAddServiceToGroup(service.id)
                          }
                          className={`px-3 py-1.5 text-sm rounded ${
                            inGroup
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {inGroup ? 'Remove' : 'Add'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowManageServices(false)
                  setSelectedGroup(null)
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Groups Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading groups...</div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FolderKanban className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">No groups created yet</p>
          <p className="text-sm text-gray-500">
            Create groups to organize your services
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              {/* Group Header */}
              <div
                className="px-6 py-4"
                style={{ backgroundColor: group.color + '20', borderLeft: `4px solid ${group.color}` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{group.icon}</span>
                    <div>
                      <div className="font-semibold text-gray-800">{group.name}</div>
                      {group.description && (
                        <div className="text-xs text-gray-600 mt-1">{group.description}</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Services List */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-gray-500">
                    {group.serviceIds?.length || 0} service{(group.serviceIds?.length || 0) !== 1 ? 's' : ''}
                  </div>
                  <button
                    onClick={() => handleManageServices(group)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Manage
                  </button>
                </div>
                {group.serviceIds && group.serviceIds.length > 0 ? (
                  <div className="space-y-2">
                    {group.serviceIds.slice(0, 3).map((serviceId) => (
                      <div key={serviceId} className="text-sm text-gray-700 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                        {getServiceName(serviceId)}
                      </div>
                    ))}
                    {group.serviceIds.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{group.serviceIds.length - 3} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">No services in this group</div>
                )}
              </div>

              {/* Actions */}
              {group.serviceIds && group.serviceIds.length > 0 && (
                <div className="px-6 py-3 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={() => handleStartAll(group.id)}
                    className="flex-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-1"
                    title="Start all services"
                  >
                    <PlayCircle className="w-3 h-3" />
                    Start All
                  </button>
                  <button
                    onClick={() => handleStopAll(group.id)}
                    className="flex-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-1"
                    title="Stop all services"
                  >
                    <Square className="w-3 h-3" />
                    Stop All
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
