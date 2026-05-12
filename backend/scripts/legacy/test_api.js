const API_URL = 'https://dtpjhomraxyezpvwfymv.supabase.co/functions/v1/api';

async function main() {
  console.log('Checking actual API response...');
  
  const response = await fetch(`${API_URL}/internal-requests?status=FULFILLED&limit=20`, {
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0cGpob21yYXh5ZXpwdndmeW12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjU4MTIwMiwiZXhwIjoyMDkyMTU3MjAyfQ.JBjHx595PJgpak8VRC6pcp9GQvRf_27micIbgpbQsts',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0cGpob21yYXh5ZXpwdndmeW12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjU4MTIwMiwiZXhwIjoyMDkyMTU3MjAyfQ.JBjHx595PJgpak8VRC6pcp9GQvRf_27micIbgpbQsts',
    }
  });
  
  const data = await response.json();
  console.log('Response keys:', Object.keys(data));
  console.log('Full response:', JSON.stringify(data, null, 2).slice(0, 2000));
}

main().catch(console.error);