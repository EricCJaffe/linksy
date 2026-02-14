import { ProfileForm } from '@/components/settings/profile-form'

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your personal information</p>
      </div>

      <ProfileForm />
    </div>
  )
}
