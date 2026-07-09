import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { idb } from "@/lib/db";
import { UserProfile, AppSettings } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthContext";

const DEFAULT_SETTINGS_ID = "app-settings";

export function useProfile() {
  const queryClient = useQueryClient();
  const { profile: firebaseProfile, loading: authLoading, updateProfileData } = useAuth();

  const { data: settings = null, isLoading: settingsLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const appSettings = await idb.get<AppSettings>("settings", DEFAULT_SETTINGS_ID);
      return appSettings || null;
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (newProfile: UserProfile) => {
      await updateProfileData(newProfile);
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: AppSettings) => {
      await idb.put("settings", { ...newSettings, id: DEFAULT_SETTINGS_ID });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    }
  });

  return {
    profile: firebaseProfile,
    settings,
    isLoading: settingsLoading || authLoading,
    updateProfile: updateProfileMutation.mutateAsync,
    updateSettings: updateSettingsMutation.mutateAsync,
    refreshProfile: () => queryClient.invalidateQueries({ queryKey: ["settings"] })
  };
}
