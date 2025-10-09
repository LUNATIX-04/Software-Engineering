"use client"

import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export default function Instruments() {
  const [detail, setDetail] = useState("")
  return ( 
    <div className='px-5 py-3 group/textarea overflow-hidden'>
                <Textarea
                  value={detail}
                  onChange={(event) => setDetail(event.target.value)}
                  className={"c_text_a1"}
                  placeholder="Add detail"
                />

                <textarea
        className={cn(
          " flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          "c_text_a1",
        )}
      />
              </div>
  )
}