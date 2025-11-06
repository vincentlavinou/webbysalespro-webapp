'use client'
import { useState } from 'react'
import { DateTime } from 'luxon'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Webinar } from '@/webinar/service'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { ALREADY_REGISTERED_SINGLE } from '@/webinar/service/error'

interface DefaultRegistrationFormProps {
    webinar: Webinar
    registerAttendee: (formData: FormData) => Promise<void>
}


const attendeeSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  session_id: z.string().uuid({ message: "Please select a session" }),
})

type AttendeeFormData = z.infer<typeof attendeeSchema>

export const DefaultRegistrationForm = ({webinar, registerAttendee}: DefaultRegistrationFormProps) => {
    
  const sessions = webinar.series?.flatMap((series) => series.sessions)

  const [pending, setPending] = useState(false)
  const router = useRouter()
    
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AttendeeFormData>({
    resolver: zodResolver(attendeeSchema),
  })

  const onSubmit = (data: AttendeeFormData) => {
    const formData = new FormData()
    formData.append("webinar_id", webinar.id)
    formData.append("session_id", data.session_id)
    formData.append("first_name", data.first_name)
    formData.append("last_name", data.last_name)
    formData.append("email", data.email)

    if(data.phone) formData.append("phone", data.phone)

    setPending(true)
    registerAttendee(formData).then(() => {
        router.push(`/${webinar.id}/register/success?session_id=${data.session_id}`)
        setPending(false)
    }).catch((e) => {
        setPending(false)
        if(e.name === ALREADY_REGISTERED_SINGLE) {
            toast.custom((t) => (
                <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
                    <div className="flex-1 w-0 p-4">
                    <div className="flex items-start">
                        <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                            {data.first_name} {data.last_name}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                            {e.message}
                        </p>
                        </div>
                    </div>
                    </div>
                    <div className="flex border-l border-gray-200">
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        Change?
                    </button>
                    </div>
                </div>
            ),{
                duration: Infinity
            })
        } else {
            toast.error(e.message)
        }
    })
  }

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className='flex flex-col gap-1'>
            <Label htmlFor="session_id">Select a Session</Label>
            <select
                id="session_id"
                {...register("session_id")}
                className="border rounded px-3 py-2 text-sm"
            >
                {sessions?.map((session) => (
                <option key={session.id} value={session.id}>
                    {DateTime.fromISO(session.scheduled_start, { zone: session.timezone || 'utc' }).toFormat("cccc, LLLL d 'at' t ZZZZ")}
                </option>
                ))}
            </select>
            {errors.session_id && <p className="text-red-500 text-sm">{errors.session_id.message}</p>}
        </div>
        <div className='flex flex-col gap-1'>
          <Label htmlFor="first_name">First Name</Label>
          <Input id="first_name" {...register('first_name')} />
          {errors.first_name && <p className="text-red-500 text-sm">{errors.first_name.message}</p>}
        </div>
        <div className='flex flex-col gap-1'>
          <Label htmlFor="last_name">Last Name</Label>
          <Input id="last_name" {...register('last_name')} />
          {errors.last_name && <p className="text-red-500 text-sm">{errors.last_name.message}</p>}
        </div>
        <div className='flex flex-col gap-1'>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        </div>
        <div className='flex flex-col gap-1'>
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" {...register('phone')} />
        </div>
        <input type='hidden' name="webinar_id" value={webinar.id} />
        <Button type="submit" className='bg-emerald-600'>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />}
            {pending ? 'Registering...' : 'Register'}
        </Button>
      </form>
    </div>
  )
}
