import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

interface LoginSearchParams {
  redirect?: string;
}

const formSchema = z.object({
  email: z.string().email({ message: "To'g'ri email manzilini kiriting" }),
  password: z.string().min(6, { message: 'Parol kamida 6 belgidan iborat bo‘lishi kerak' }),
})

export const Route = createFileRoute('/')({
  component: App,
  validateSearch: (search: Record<string, unknown>): LoginSearchParams => {
    return {
      redirect: search.redirect as string | undefined,
    }
  },
})

function App() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { redirect } = useSearch({ from: '/' })
  const [error, setError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  if (isAuthenticated && redirect) {
    navigate({ to: redirect })
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setError(null)
      await login(values.email, values.password)

      if (redirect) {
        navigate({ to: redirect })
      } else {
        navigate({ to: '/table' })
      }
    } catch (err) {
      setError('Login failed. Please check your credentials.')
      console.error('Login error:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6 flex items-center justify-center">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Login</h1>
        {error && (
          <div className="mb-4 p-3 bg-red-500 text-white rounded-md">
            {error}
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Email manzilingizni kiriting"
                      className="bg-gray-700 text-white border-gray-600"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Parolingizni kiriting"
                      className="bg-gray-700 text-white border-gray-600"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Login
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}