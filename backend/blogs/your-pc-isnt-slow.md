# Your computer isn’t slow. Windows 11 is just annoying

I’ve been tinkering with computers since I was 5 years old. My father introduced me to this world through gaming, and I've been obsessed with optimizing hardware ever since. In my circle, I’m often the "go-to" guy for tech issues, and today I want to share a fix for the most common complaint I hear:

> My PC feels sluggish.

Recently, a friend came to me with a quite competent setup (Intel i5-12500, RTX 4050, 16GB DDR5 RAM). On paper, this machine should fly. In reality? It was struggling.

It wasn’t his hardware’s fault. It was the "infinite wisdom" of modern Windows.

I opened his Start menu and found the culprits immediately: Pre-installed apps like Instagram and Clipchamp, forced AI integration (Copilot), and OneDrive silently syncing data without his consent. This is called "bloatware," and it eats your system resources for breakfast.

![Bloatware on Windows 11 after Clean Install](https://i.ibb.co/cK57TdzC/image-2026-01-19-11-32-45.png)
*Bloatware on Windows 11 after Clean Install*

---

## 👇 The Windows 11 Detox Guide 👇

> **Note:** These tools are powerful. I strongly recommend creating a System Restore Point before starting.

### 🛠️ 1. The Swiss Army Knife: Chris Titus Tech's WinUtil

This is the ultimate tool for essential tweaks and bulk installs.

**How to use:** Right-click Start, open Terminal (Admin) or PowerShell (Admin).

Type this and hit Enter:
```powershell
irm christitus.com/win | iex
```

**The Fix:** Go to the "Tweaks" tab. Match the settings in the image below and click Run Tweaks.

![Match the settings for a cleaner and snappier Windows 11](https://i.ibb.co/S4gCvw0f/image-2026-01-19-11-32-20.png)
*Match the settings for a cleaner and snappier Windows 11*

### 🗑️ 2. The Deep Clean: Raphire’s Win11Debloat

This targets specific Windows 11 annoyances.

**How to use:** In the same PowerShell (Admin) window.

Type this and hit Enter:
```powershell
& ([scriptblock]::Create((irm "https://debloat.raphi.re/")))
```

**The Fix:** A menu will pop up. Select "Default Mode" for a safe, recommended cleanup.

![Choose 1 for recommended debloat](https://i.ibb.co/Kcqs02T6/image-2026-01-19-11-42-35.png)
*Choose 1 for recommended debloat*

### 👻 3. The AI Exorcist: RemoveWindowsAI

If you hate the forced Copilot and AI integration, this is the specialized tool to remove it.

**How to use:** In PowerShell (Admin).

Type this and hit Enter:
```powershell
& ([scriptblock]::Create((irm 'https://kutt.it/RWAI')))
```

**The Fix:** Follow the on-screen guidance. **Important:** Make sure to enable "Backup Mode" in the GUI for safety before proceeding.

![Default options should be fine for an AI-Free Windows](https://i.ibb.co/5X0hh0Gq/534787404-fa105ba5-c1dc-447c-ae2e-7ee373291042.png)
*Default options should be fine for an AI-Free Windows*

### 🔒 4. The Privacy Guard: O&O ShutUp10

Windows loves to "phone home" with your data. This stops it.

**How to use:** You can launch this directly from the Chris Titus tool (under "Install") or download it separately.

**The Fix:** Open the app, click Actions, and select "Apply only recommended settings." Green switches mean you are protected.

![Do this, and Microsoft wont phone home](https://via.placeholder.com/800x450?text=O%26O+ShutUp10+Settings)
*Do this, and Microsoft wont phone home*

---

### The Result

After just 15 minutes, my friend’s PC was snappy again. (Though, full disclosure: he was so annoyed with the initial bloat he eventually switched to Windows 10 LTSC—but that’s a guide for another day!).

#### 🔗 Project Sources & Credits:

*   [Chris Titus Tool](https://christitus.com/windows-tool/)
*   [Raphire’s Debloat](https://github.com/Raphire/Win11Debloat)
*   [RemoveWindowsAI](https://github.com/zoicware/RemoveWindowsAI)
*   [O&O ShutUp10](https://www.oo-software.com/en/shutup10)

This is my first blog here. I’m planning to share more "real-world" tech fixes like this over the next week—no fluff, just solutions.

#TechTips #Windows11 #Optimization #PCBuilds #TechCommunity #Debloat
