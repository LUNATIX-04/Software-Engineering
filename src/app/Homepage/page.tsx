import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function Homepage() {
  return (
    <div className="min-h-dvh flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-primary px-[clamp(1.5rem,1vw,3rem)] py-[clamp(0.6rem,1vh,1rem)]">
            <div className="  flex items-center justify-between">
                {/* Left Side*/}
                <div className="flex items-center space-x-[clamp(1.5rem,7vw,7rem)]">
                    <h1 className="text-primary-foreground text-3xl font-bold leading-none">ASAP</h1>
                    <nav>
                        <a href="#" className="text-primary-foreground text-lg font-semibold font-medium">
                            Project
                        </a>
                    </nav>
                </div>
                {/* Right side */}
                <Button
                    variant="secondary"
                    className="bg-button-background-on-nav text-button-foreground-on-nav hover:bg-button-hover-background-on-nav rounded-full ml-40 px-[clamp(2.5rem,5vw,4rem)] py-[clamp(0.5rem,1.6vh,0.85rem)] text-[clamp(1rem,2.1vw,1.15rem)] font-semibold"
                >
                    Login
                </Button>
            </div>
        </header>

        {/* Body Section */}
        <main className="flex-1 bg-[#F5F5F7] flex items-center justify-center">
            <div className="max-w-[min(80rem,90vw)] w-full mx-auto px-[clamp(1.5rem,5vw,4rem)] py-[clamp(2rem,9vh,6rem)]">
                <div className="grid md:grid-cols-2 gap-[clamp(2rem,5vw,3rem)] items-center">
                    {/* Left Content */}
                    <div className="space-y-8">
                        <h2 className="text-[clamp(0.5rem,4vw,5rem)] text-foreground leading-tight">
                            <span className="font-bold">Create your Project</span>
                            <br />
                            <span className="text-[clamp(1.5rem,3vw,2.5rem)] font-semibold">to WORK ASAP!</span>
                        </h2>
                        <Button className="bg-button-background hover:bg-button-hover-background text-button-foreground rounded-full px-[clamp(2.5rem,6vw,3.8rem)] py-[clamp(0.75rem,4vh,3.25rem)] text-[clamp(1rem,2.2vw,1.35rem)] font-semibold">
                            Get Started
                        </Button>
                    </div>

                    {/* Right Illustration */}
                    <div className="flex justify-center">
                        <div className="relative w-full max-w-[min(28rem,60vw)] max-h-[55vh] aspect-square">
                        <Image
                            src="/imageWeb/Homepage/logo.png"
                            alt="Project management illustration showing to-do lists, charts, and productivity tools"
                            fill
                            className="object-contain"
                            priority
                        />
                        </div>
                    </div>
                </div>
            </div>
        </main>

        {/* Footer */}
        <footer className="bg-[#5B5283] py-[clamp(1.5rem,1vh,1rem)]">
            <div className="max-w-7xl mx-auto px-6">{/* Footer content can be added here */}</div>
        </footer>
    </div>
  )
}
