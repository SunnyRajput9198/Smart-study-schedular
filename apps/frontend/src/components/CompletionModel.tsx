// apps/frontend/src/components/CompletionModal.tsx
'use client';
import { useState, FormEvent } from 'react';
import apiClient from '../api/axios';
import { Task } from '../app/subjects/[subjectId]/page';
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
// Replace the old Props with this
interface Props {
  task: Task;
  onSessionSaved: (completedTask: Task) => void;
  onClose: () => void; // We still need onClose for the cancel button
}

export default function CompletionModal({ task, onClose, onSessionSaved }: Props) {
  const [actualDuration, setActualDuration] = useState('');
  const [difficulty, setDifficulty] = useState(3); // Default difficulty
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // <-- YEH LINE ADD KAREIN
  const [revisionDate, setRevisionDate] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); // <-- YEH LINE ADD KAREIN
    if (!actualDuration) {
      setError('Please enter the actual time taken.');
      return;
    }

    // Replace the old try...catch block with this one
    try {
      const sessionData = {
        actual_duration: parseInt(actualDuration, 10),
        user_difficulty_rating: difficulty,
      };

      const response = await apiClient.post(`/sessions/${task.id}/complete`, sessionData);

      // Now, we only call one function to tell the parent page everything it needs to know
      onSessionSaved(response.data);

    } catch (err) {
      console.error("Failed to complete session:", err);
      setError("Could not save session. Please try again.");
      setIsSubmitting(false); // <-- YEH LINE ADD KAREIN
    }
  };
  // --- YEH NAYA FUNCTION ADD KAREIN ---
 // --- PURAANA handleSaveAndReschedule ISSE REPLACE KAREIN ---
const handleSaveAndReschedule = async (e: FormEvent) => {
    e.preventDefault();
    // Check for empty duration first
    if (!actualDuration) {
        setError('Please enter the actual time taken.');
        return;
    }
    setIsSubmitting(true); // Disable buttons immediately

    try {
        const sessionData = {
            actual_duration: parseInt(actualDuration, 10),
            user_difficulty_rating: difficulty,
        };

        const delay_days = revisionDate ? differenceInCalendarDays(revisionDate, new Date()) : 7;

        // Hum dono API calls (complete aur reschedule) ko ek saath bhejenge
        const [completeResponse] = await Promise.all([
            apiClient.post(`/sessions/${task.id}/complete`, sessionData),
            apiClient.post(`/tasks/${task.id}/reschedule`, { delay_days })
        ]);

        // Parent page ko batayein ki task complete ho gaya hai
        onSessionSaved(completeResponse.data);

    } catch (err) {
        console.error("Failed to save and reschedule:", err);
        setError("Could not complete the action. Please try again.");
        setIsSubmitting(false); // Error aane par buttons ko re-enable karein
    }
};
// --- YAHAN TAK REPLACE KAREIN ---

  return (
    // This is the semi-transparent background overlay
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
      onClick={onClose} // Close modal if you click outside of it
    >
      {/* This is the modal content itself */}
      <div
        className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside the modal
      >
        <h2 className="text-2xl font-bold mb-4">Complete Task: {task.title}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="actualDuration" className="block text-sm font-medium text-gray-300">
              Actual Time Taken (minutes)
            </label>
            <input
              id="actualDuration"
              type="number"
              value={actualDuration}
              onChange={(e) => setActualDuration(e.target.value)}
              className="w-full p-2 mt-1 bg-gray-700 border border-gray-600 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              How difficult was this task? (1-5)
            </label>
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-400">Easy</span>
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  type="button"
                  key={rating}
                  onClick={() => setDifficulty(rating)}
                  className={`w-10 h-10 rounded-full transition-colors ${difficulty === rating
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                >
                  {rating}
                </button>
              ))}
              <span className="text-gray-400">Hard</span>
            </div>
          </div>
<div className="my-4">
    <label className="block text-sm font-medium text-gray-300 mb-2">
        Revise this task on:
    </label>
    <Popover>
        <PopoverTrigger asChild>
            <Button
                variant={"outline"}
                className="w-full justify-start text-left font-normal"
            >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {revisionDate ? format(revisionDate, "PPP") : <span>Pick a date</span>}
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
            <Calendar
                mode="single"
                selected={revisionDate}
                onSelect={setRevisionDate}
                disabled={(date) => date < new Date()}
            />
        </PopoverContent>
    </Popover>
</div>
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 font-semibold bg-gray-600 rounded-md hover:bg-gray-500"
            >
              Cancel
            </button>
            <div className='flex gap-2'>
              <button
                type="submit"
                disabled={isSubmitting} 
                className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Save Session
              </button>
              <button
                type="button"
                onClick={handleSaveAndReschedule}
                disabled={isSubmitting} // <-- YEH LINE ADD KAREIN
                className="px-4 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Complete & Revise
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 text-center mt-2">{error}</p>}
        </form>
      </div>
    </div>
  );
}