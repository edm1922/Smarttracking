import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_KEY || ''
    );
  }

  async uploadImage(file: any, path: string) {
    const { data, error } = await this.supabase.storage
      .from('item-images')
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) throw error;
    
    const { data: publicUrlData } = this.supabase.storage
      .from('item-images')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  }

  async deleteImage(path: string) {
    const { error } = await this.supabase.storage
      .from('item-images')
      .remove([path]);
    
    if (error) console.error('Failed to delete image from Supabase:', error);
  }
}
