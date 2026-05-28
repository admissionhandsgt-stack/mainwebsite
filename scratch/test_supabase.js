import { createClient } from '@supabase/supabase-js';

const url = 'https://nlxbqseaumhjenlnigxd.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5seGJxc2VhdW1oamVubG5pZ3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjQ3MTAsImV4cCI6MjA5NDI0MDcxMH0.GG6dnO5WeeQsEfGCnU06fuhAZKb8qvkeqEb083ZqvwM';

const supabase = createClient(url, key);

async function testAuth() {
  console.log('Testing Supabase authentication...');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@admissionhands.com',
      password: 'Admin@12345'
    });
    
    if (error) {
      console.error('Authentication failed:', error.message || error);
    } else {
      console.log('Authentication successful!');
      console.log('User ID:', data.user.id);
      console.log('User Email:', data.user.email);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testAuth();
