import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import ProtectedRoute from '../components/ProtectedRoute'

interface DummyJSONUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface DummyJSONResponse {
  users: DummyJSONUser[];
  total: number;
  skip: number;
  limit: number;
}

export const Route = createFileRoute('/tanstack-query')({
  component: () => (
    <ProtectedRoute>
      <TanStackQueryDemo />
    </ProtectedRoute>
  ),
})

function TanStackQueryDemo() {
  const { data, isLoading, error } = useQuery<DummyJSONResponse>({
    queryKey: ['people'],
    queryFn: async () => {
      const response = await axios.get<DummyJSONResponse>('https://dummyjson.com/users');
      return response.data;
    },
    initialData: { users: [], total: 0, skip: 0, limit: 0 },
  })

  return (
    <div className="min-h-screen bg-gray-900 p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-gray-800 p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">People List</h1>
        {isLoading && (
          <div className="text-center text-gray-400">Loading...</div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-500 text-white rounded-md">
            Error: {error.message}
          </div>
        )}
        {!isLoading && !error && data.users.length === 0 && (
          <div className="text-center text-gray-400">No users found.</div>
        )}
        {!isLoading && !error && data.users.length > 0 && (
          <ul className="space-y-2">
            {data.users.map((person) => (
              <li
                key={person.id}
                className="p-3 bg-gray-700 text-white rounded-md"
              >
                {person.firstName} {person.lastName} ({person.email})
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}