'use client'
import { DateTime } from 'luxon'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Webinar } from '@/webinar/service'

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
    
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AttendeeFormData>({
    resolver: zodResolver(attendeeSchema),
  })

  const onSubmit = (data: AttendeeFormData) => {
    console.log('Submitted attendee:', data)
    registerAttendee(new FormData())
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
                <option value="">-- Select a session --</option>
                {webinar.sessions?.map((session) => (
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
        <Button type="submit">Register</Button>
      </form>
    </div>
  )
}
