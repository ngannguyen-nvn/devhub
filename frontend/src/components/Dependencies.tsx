import { useEffect, useState } from 'react'
import { GitBranch, Plus, Trash2, RefreshCw, AlertCircle, ArrowRight, PlayCircle } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useWorkspace } from '../contexts/WorkspaceContext'

interface Dependency {
  id: string
  serviceId: string
  dependsOnServiceId: string
  waitForHealth: boolean
  startupDelay: number
  createdAt: string
}

interface Service {
  id: string
  name: string
}

export default function Dependencies() {
  const { activeWorkspace } = useWorkspace()
  const [dependencies, setDependencies] = useState<Dependency[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [startupOrder, setStartupOrder] = useState<string[]>([])
  const [cycles, setCycles] = useState<string[][]>([])

  const [newDependency, setNewDependency] = useState({
    serviceId: '',
    dependsOnServiceId: '',
    waitForHealth: true,
    startupDelay: 0,
  })

  useEffect(() => {
    if (activeWorkspace) {
      fetchDependencies()
      fetchServices()
    }
  }, [activeWorkspace])

  const fetchServices = async () => {
    try {
      const response = await axios.get('/api/services')
      setServices(response.data.services)
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  const fetchDependencies = async () => {
    if (!activeWorkspace) return

    setLoading(true)
    try {
      const response = await axios.get(`/api/dependencies/workspace/${activeWorkspace.id}/all`)
      setDependencies(response.data.dependencies || [])

      // Calculate startup order
      if (response.data.dependencies && response.data.dependencies.length > 0) {
        calculateStartupOrder()
      }
    } catch (error) {
      console.error('Error fetching dependencies:', error)
      toast.error('Failed to fetch dependencies')
    } finally {
      setLoading(false)
    }
  }

  const calculateStartupOrder = async () => {
    if (!activeWorkspace || services.length === 0) return

    try {
      const serviceIds = services.map(s => s.id)
      const response = await axios.post(
        `/api/dependencies/workspace/${activeWorkspace.id}/startup-order`,
        { serviceIds }
      )
      setStartupOrder(response.data.order || [])
      setCycles(response.data.cycles || [])
    } catch (error) {
      console.error('Error calculating startup order:', error)
    }
  }

  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newDependency.serviceId || !newDependency.dependsOnServiceId) {
      toast.error('Please select both services')
      return
    }

    if (newDependency.serviceId === newDependency.dependsOnServiceId) {
      toast.error('A service cannot depend on itself')
      return
    }

    try {
      await axios.post('/api/dependencies', newDependency)
      toast.success('Dependency added successfully')
      setShowAddForm(false)
      setNewDependency({
        serviceId: '',
        dependsOnServiceId: '',
        waitForHealth: true,
        startupDelay: 0,
      })
      fetchDependencies()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add dependency')
    }
  }

  const handleDeleteDependency = async (id: string) => {
    try {
      await axios.delete(`/api/dependencies/${id}`)
      toast.success('Dependency removed')
      fetchDependencies()
    } catch (error) {
      toast.error('Failed to remove dependency')
    }
  }

  const getServiceName = (serviceId: string) => {
    return services.find(s => s.id === serviceId)?.name || serviceId
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <GitBranch className="w-6 h-6" />
            Service Dependencies
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Define service startup order and dependencies
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchDependencies}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Dependency
          </button>
        </div>
      </div>

      {!activeWorkspace && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <span className="text-yellow-800">Please activate a workspace to manage dependencies</span>
        </div>
      )}

      {/* Add Dependency Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add New Dependency</h2>
          <form onSubmit={handleAddDependency} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service
                </label>
                <select
                  value={newDependency.serviceId}
                  onChange={(e) => setNewDependency({ ...newDependency, serviceId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select service...</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Depends On
                </label>
                <select
                  value={newDependency.dependsOnServiceId}
                  onChange={(e) => setNewDependency({ ...newDependency, dependsOnServiceId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select service...</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newDependency.waitForHealth}
                    onChange={(e) => setNewDependency({ ...newDependency, waitForHealth: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Wait for health check</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Startup Delay (seconds)
                </label>
                <input
                  type="number"
                  value={newDependency.startupDelay}
                  onChange={(e) => setNewDependency({ ...newDependency, startupDelay: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
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
                Add Dependency
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Startup Order */}
      {startupOrder.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2">
            <PlayCircle className="w-5 h-5" />
            Recommended Startup Order
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {startupOrder.map((serviceId, index) => (
              <div key={serviceId} className="flex items-center gap-2">
                <span className="px-3 py-1 bg-white border border-green-300 rounded-lg text-sm font-medium">
                  {index + 1}. {getServiceName(serviceId)}
                </span>
                {index < startupOrder.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-green-600" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Circular Dependency Warning */}
      {cycles.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">Circular Dependency Detected!</span>
          </div>
          <p className="text-sm text-red-700 mt-2">
            The following services have circular dependencies and cannot be started:
          </p>
          <div className="mt-2 flex gap-2 flex-wrap">
            {cycles.flat().map((serviceId) => (
              <span key={serviceId} className="px-2 py-1 bg-red-100 rounded text-sm">
                {getServiceName(serviceId)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dependencies List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Current Dependencies</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading dependencies...</div>
        ) : dependencies.length === 0 ? (
          <div className="p-12 text-center">
            <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">No dependencies configured</p>
            <p className="text-sm text-gray-500">
              Add dependencies to control service startup order
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {dependencies.map((dep) => (
              <div key={dep.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-800">
                      {getServiceName(dep.serviceId)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {getServiceName(dep.dependsOnServiceId)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    {dep.waitForHealth && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        Wait for health
                      </span>
                    )}
                    {dep.startupDelay > 0 && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                        Delay: {dep.startupDelay}s
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteDependency(dep.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Remove dependency"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
