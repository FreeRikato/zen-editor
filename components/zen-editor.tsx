"use client"

import type React from "react"


import { useState, useEffect, useRef, useCallback } from "react"
import {
  ChevronDown,
  ChevronRight,
  Code,
  FileText,
  Folder,
  FolderOpen,
  Menu,
  X,
  Command,
  Settings,
  Maximize,
  Minimize,
  Sun,
  Moon,
  Laptop,
  Keyboard,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Editor, { type Monaco, useMonaco } from "@monaco-editor/react"
import { useMediaQuery } from "@/hooks/use-mobile"

// Define Vim mode types for better type safety
type VimMode = "NORMAL" | "INSERT" | "VISUAL"

export default function ZenEditor() {
  // Responsive state
  const isMobile = useMediaQuery("(max-width: 768px)")
  const monaco = useMonaco()

  // Core state management
  const [activeFile, setActiveFile] = useState("src/components/Button.tsx")
  const [openFolders, setOpenFolders] = useState<string[]>(["src", "src/components"])
  const [showFileTree, setShowFileTree] = useState(!isMobile)
  const [vimMode, setVimMode] = useState<VimMode>("NORMAL")
  const [zenMode, setZenMode] = useState(false)
  const [cursorPosition, setCursorPosition] = useState({ line: 24, column: 15 })
  const [harpoonFiles, setHarpoonFiles] = useState([
    "src/components/Button.tsx",
    "src/components/Card.tsx",
    "src/lib/utils.ts",
    "src/app/page.tsx",
  ])
  const [openTabs, setOpenTabs] = useState(["src/components/Button.tsx", "src/components/Card.tsx", "src/lib/utils.ts"])
  const [breatheAnimation, setBreatheAnimation] = useState(true)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [theme, setTheme] = useState<"dark" | "light" | "high-contrast">("dark")
  const [fontSize, setFontSize] = useState(14)
  const [tabSize, setTabSize] = useState(4)
  const [wordWrap, setWordWrap] = useState(false)
  const [showMinimap, setShowMinimap] = useState(true)
  const [vimModeEnabled, setVimModeEnabled] = useState(true)
  const [commandPaletteResults, setCommandPaletteResults] = useState<string[]>([])
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)
  const [editorLanguage, setEditorLanguage] = useState("typescript")

  // Refs
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const commandInputRef = useRef<HTMLInputElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)


  // File content cache
  const [fileContents, setFileContents] = useState<Record<string, string>>({
    "src/components/Button.tsx": getSampleButtonCode(),
    "src/components/Card.tsx": getSampleCardCode(),
    "src/lib/utils.ts": getSampleUtilsCode(),
    "src/app/page.tsx": getSamplePageCode(),
  })

  // Toggle folder open/closed
  const toggleFolder = (folder: string) => {
    if (openFolders.includes(folder)) {
      setOpenFolders(openFolders.filter((f) => f !== folder))
    } else {
      setOpenFolders([...openFolders, folder])
    }
  }

  // Open file
  const openFile = useCallback(
    (filePath: string) => {
      setActiveFile(filePath)

      // Add to open tabs if not already open
      if (!openTabs.includes(filePath)) {
        setOpenTabs([...openTabs, filePath])
      }

      // Determine language based on file extension
      const extension = filePath.split(".").pop()?.toLowerCase() || ""
      if (extension === "ts" || extension === "tsx") {
        setEditorLanguage("typescript")
      } else if (extension === "js" || extension === "jsx") {
        setEditorLanguage("javascript")
      } else if (extension === "json") {
        setEditorLanguage("json")
      } else if (extension === "css") {
        setEditorLanguage("css")
      } else if (extension === "html") {
        setEditorLanguage("html")
      } else {
        setEditorLanguage("plaintext")
      }

      // On mobile, close the file tree after selecting a file
      if (isMobile) {
        setShowFileTree(false)
      }
    },
    [openTabs, isMobile],
  )

  // Close tab
  const closeTab = (tab: string, e: React.MouseEvent) => {
    e.stopPropagation()

    // Remove the tab
    const newTabs = openTabs.filter((t) => t !== tab)
    setOpenTabs(newTabs)

    // If we closed the active tab, switch to another tab
    if (activeFile === tab && newTabs.length > 0) {
      setActiveFile(newTabs[0])
    }
  }

  // Toggle zen mode
  const toggleZenMode = useCallback(() => {
    setZenMode((prev) => !prev)

    // In zen mode, hide the file tree
    if (!zenMode) {
      setShowFileTree(false)
    }

    // Apply editor settings for zen mode
    if (editorRef.current) {
      const newZenMode = !zenMode
      editorRef.current.updateOptions({
        minimap: { enabled: !newZenMode && showMinimap },
        lineNumbers: newZenMode ? "off" : "on",
        glyphMargin: !newZenMode,
        folding: !newZenMode,
        lineDecorationsWidth: newZenMode ? 0 : 10,
        lineNumbersMinChars: newZenMode ? 0 : 5,
        renderLineHighlight: newZenMode ? "none" : "all",
        renderWhitespace: newZenMode ? "none" : "selection",
        contextmenu: !newZenMode,
        scrollbar: {
          vertical: newZenMode ? "hidden" : "auto",
          horizontal: newZenMode ? "hidden" : "auto",
        },
      })
    }
  }, [zenMode, showMinimap])

  // Apply editor settings
  const applyEditorSettings = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: fontSize,
        tabSize: tabSize,
        wordWrap: wordWrap ? "on" : "off",
        minimap: { enabled: !zenMode && showMinimap },
      })
    }
  }, [fontSize, tabSize, wordWrap, zenMode, showMinimap])

  // Handle editor mount
  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Set up Vim mode keybindings
    setupVimMode(editor, monaco)

    // Update cursor position on change
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column,
      })
    })

    // Apply initial editor settings
    applyEditorSettings()

    // Set up editor content change handler
    editor.onDidChangeModelContent(() => {
      // Save content to our cache
      if (activeFile) {
        setFileContents((prev) => ({
          ...prev,
          [activeFile]: editor.getValue(),
        }))
      }
    })
  }

  // Set up Vim mode
  const setupVimMode = (editor: any, monaco: Monaco) => {
    // This is a simplified simulation of Vim mode
    // In a real implementation, you would use a proper Vim mode extension

    editor.onKeyDown((e: any) => {
      if (!vimModeEnabled) return

      // Simulate Vim mode changes
      if (e.ctrlKey && e.keyCode === monaco.KeyCode.Escape) {
        setVimMode("NORMAL")
        // Add a visual indicator in the editor
        editor.updateOptions({ cursorStyle: "block" })
      } else if (e.ctrlKey && e.keyCode === monaco.KeyCode.KeyI) {
        setVimMode("INSERT")
        // Add a visual indicator in the editor
        editor.updateOptions({ cursorStyle: "line" })
      } else if (e.ctrlKey && e.keyCode === monaco.KeyCode.KeyV) {
        setVimMode("VISUAL")
        // Add a visual indicator in the editor
        editor.updateOptions({ cursorStyle: "underline" })
      }

      // Handle Vim-like navigation in NORMAL mode
      if (vimMode === "NORMAL") {
        const position = editor.getPosition()

        // j - move down
        if (e.code === "KeyJ" && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault()
          editor.setPosition({ lineNumber: position.lineNumber + 1, column: position.column })
        }

        // k - move up
        if (e.code === "KeyK" && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault()
          editor.setPosition({ lineNumber: position.lineNumber - 1, column: position.column })
        }

        // h - move left
        if (e.code === "KeyH" && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault()
          editor.setPosition({ lineNumber: position.lineNumber, column: position.column - 1 })
        }

        // l - move right
        if (e.code === "KeyL" && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault()
          editor.setPosition({ lineNumber: position.lineNumber, column: position.column + 1 })
        }

        // i - enter insert mode
        if (e.code === "KeyI" && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault()
          setVimMode("INSERT")
          editor.updateOptions({ cursorStyle: "line" })
        }

        // v - enter visual mode
        if (e.code === "KeyV" && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault()
          setVimMode("VISUAL")
          editor.updateOptions({ cursorStyle: "underline" })
        }
      }
    })

    // Handle global keyboard shortcuts
    editor.onKeyDown((e: any) => {
      // Zen mode toggle with Ctrl+Shift+Z
      if (e.ctrlKey && e.shiftKey && e.keyCode === monaco.KeyCode.KeyZ) {
        e.preventDefault()
        toggleZenMode()
      }

      // Command palette with Ctrl+P
      if (e.ctrlKey && e.keyCode === monaco.KeyCode.KeyP) {
        e.preventDefault()
        setShowCommandPalette(true)
      }

      // Settings with Ctrl+,
      if (e.ctrlKey && e.keyCode === monaco.KeyCode.Comma) {
        e.preventDefault()
        setShowSettings(true)
      }

      // Harpoon navigation
      if (e.ctrlKey) {
        if (e.keyCode === monaco.KeyCode.KeyH) {
          e.preventDefault()
          openFile(harpoonFiles[0])
        } else if (e.keyCode === monaco.KeyCode.KeyJ) {
          e.preventDefault()
          openFile(harpoonFiles[1])
        } else if (e.keyCode === monaco.KeyCode.KeyK) {
          e.preventDefault()
          openFile(harpoonFiles[2])
        } else if (e.keyCode === monaco.KeyCode.KeyL) {
          e.preventDefault()
          openFile(harpoonFiles[3])
        }
      }
    })
  }

  useEffect(() => {
    /* load monaco */
    console.log("monaco", monaco)
    if (monaco) {
      // Import and use night-owl.json instead of hardcoding
      import('../night-owl.json')
        .then(module => {
          const nightOwlTheme = module.default;
          monaco.editor.defineTheme("night-owl", {
            base: "vs-dark", // Explicitly set as a valid BuiltinTheme value
            inherit: nightOwlTheme.inherit,
            rules: nightOwlTheme.rules,
            colors: nightOwlTheme.colors
          });
          monaco.editor.setTheme("night-owl")
        })
        .catch(error => {
          console.error("Failed to load Night Owl theme:", error)
        })
    }
  }, [monaco])

  // Handle keyboard shortcuts globally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Add this block at the beginning to capture all editor control keys
      if (e.ctrlKey) {
        // Prevent default browser behavior for all Ctrl+key combinations used in the editor
        if (['j', 'k', 'h', 'l', 'b', 'p', ','].includes(e.key.toLowerCase()) || 
            (e.shiftKey && e.key === 'Z')) {
          e.preventDefault();
        }
      }

      // Toggle file tree with Ctrl+B
      if (e.ctrlKey && e.key === "b") {
        setShowFileTree(!showFileTree)
      }

      // Toggle zen mode with Ctrl+Shift+Z
      if (e.ctrlKey && e.shiftKey && e.key === "Z") {
        e.preventDefault()
        toggleZenMode()
      }

      // Command palette with Ctrl+P
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault()
        setShowCommandPalette(true)
        setTimeout(() => {
          commandInputRef.current?.focus()
        }, 100)
      }

      // Settings with Ctrl+,
      if (e.ctrlKey && e.key === ",") {
        e.preventDefault()
        setShowSettings(true)
      }

      // Close command palette or settings with Escape
      if (e.key === "Escape") {
        if (showCommandPalette) {
          setShowCommandPalette(false)
          return
        }
        if (showSettings) {
          setShowSettings(false)
          return
        }
      }

      // Navigate command palette results with arrow keys
      if (showCommandPalette) {
        if (e.key === "ArrowDown") {
          e.preventDefault()
          setSelectedCommandIndex((prev) => (prev < commandPaletteResults.length - 1 ? prev + 1 : prev))
        } else if (e.key === "ArrowUp") {
          e.preventDefault()
          setSelectedCommandIndex((prev) => (prev > 0 ? prev - 1 : 0))
        } else if (e.key === "Enter" && commandPaletteResults.length > 0) {
          e.preventDefault()
          const selected = commandPaletteResults[selectedCommandIndex]
          if (selected) {
            openFile(selected)
            setShowCommandPalette(false)
          }
        }
      }
    }

    // Use capture: true to ensure your handler runs before browser defaults
    window.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [
    showFileTree,
    showCommandPalette,
    showSettings,
    commandPaletteResults,
    selectedCommandIndex,
    openFile,
    toggleZenMode,
  ])

  // Apply editor settings when they change
  useEffect(() => {
    applyEditorSettings()
  }, [applyEditorSettings])

  // Update command palette results when search term changes
  useEffect(() => {
    if (searchTerm) {
      const results = filteredFiles()
      setCommandPaletteResults(results)
      setSelectedCommandIndex(0)
    } else {
      setCommandPaletteResults([])
    }
  }, [searchTerm])

  // Handle clicks outside of settings panel to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }

    if (showSettings) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showSettings])

  // Handle responsive layout changes
  useEffect(() => {
    if (isMobile) {
      setShowFileTree(false)
    }
  }, [isMobile])

  // File tree data
  const fileTree = [
    {
      name: "src",
      type: "folder",
      children: [
        {
          name: "app",
          type: "folder",
          children: [
            { name: "layout.tsx", type: "file" },
            { name: "page.tsx", type: "file" },
          ],
        },
        {
          name: "components",
          type: "folder",
          children: [
            { name: "Button.tsx", type: "file" },
            { name: "Card.tsx", type: "file" },
            { name: "Input.tsx", type: "file" },
            { name: "Modal.tsx", type: "file" },
          ],
        },
        {
          name: "lib",
          type: "folder",
          children: [{ name: "utils.ts", type: "file" }],
        },
      ],
    },
    {
      name: "public",
      type: "folder",
      children: [
        { name: "favicon.ico", type: "file" },
        { name: "logo.svg", type: "file" },
      ],
    },
    { name: "package.json", type: "file" },
    { name: "tsconfig.json", type: "file" },
  ]

  // Get file content based on active file
  const getFileContent = (filePath: string) => {
    return fileContents[filePath] || "// File not found"
  }

  // Filter files for command palette
  const filteredFiles = () => {
    const allFiles: string[] = []

    const extractFiles = (items: any[], basePath = "") => {
      items.forEach((item) => {
        const fullPath = basePath ? `${basePath}/${item.name}` : item.name

        if (item.type === "file") {
          allFiles.push(fullPath)
        } else if (item.children) {
          extractFiles(item.children, fullPath)
        }
      })
    }

    extractFiles(fileTree)

    return allFiles.filter((file) => file.toLowerCase().includes(searchTerm.toLowerCase()))
  }

  // Render file tree recursively
  const renderFileTree = (items: any[], basePath = "") => {
    return items.map((item) => {
      const fullPath = basePath ? `${basePath}/${item.name}` : item.name

      if (item.type === "folder") {
        const isOpen = openFolders.includes(fullPath)

        return (
          <div key={fullPath} className="select-none">
            <div
              className={cn(
                "flex items-center py-1 px-2 text-sm rounded-md cursor-pointer hover:bg-zinc-700/50 transition-colors",
                fullPath === activeFile && "bg-zinc-700/70",
              )}
              onClick={() => toggleFolder(fullPath)}
              role="treeitem"
              aria-expanded={isOpen}
            >
              <span className="mr-1 text-zinc-400">
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </span>
              <span className="mr-1.5 text-blue-400">
                {isOpen ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
              </span>
              <span className="text-zinc-300">{item.name}</span>
            </div>

            {isOpen && item.children && (
              <div className="pl-4 border-l border-zinc-700/50 ml-2.5 my-1" role="group">
                {renderFileTree(item.children, fullPath)}
              </div>
            )}
          </div>
        )
      } else {
        // File item
        return (
          <div
            key={fullPath}
            className={cn(
              "flex items-center py-1 px-2 text-sm rounded-md cursor-pointer hover:bg-zinc-700/50 transition-colors",
              fullPath === activeFile && "bg-zinc-700/70 text-white",
            )}
            onClick={() => openFile(fullPath)}
            role="treeitem"
            aria-selected={fullPath === activeFile}
          >
            <span className="mr-1.5 opacity-70">
              {fullPath.endsWith(".tsx") || fullPath.endsWith(".ts") ? (
                <Code className="h-4 w-4 text-cyan-400" />
              ) : (
                <FileText className="h-4 w-4 text-zinc-400" />
              )}
            </span>
            <span className={cn(fullPath === activeFile ? "text-white" : "text-zinc-300")}>{item.name}</span>
          </div>
        )
      }
    })
  }

  // Get vim mode color
  const getVimModeColor = () => {
    switch (vimMode) {
      case "NORMAL":
        return "text-green-400"
      case "INSERT":
        return "text-blue-400"
      case "VISUAL":
        return "text-red-400"
      default:
        return "text-zinc-400"
    }
  }

  // Get Monaco theme based on selected theme
  const getMonacoTheme = () => {
    switch (theme) {
      case "light":
        return "vs"
      case "dark":
        return "vs-dark"
      case "high-contrast":
        return "hc-black"
      default:
        return "vs-dark"
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col h-screen text-zinc-300 font-mono transition-all duration-300",
        theme === "dark" && "bg-zinc-900",
        theme === "light" && "bg-zinc-100 text-zinc-800",
        theme === "high-contrast" && "bg-black text-white",
        zenMode && "bg-black",
      )}
      role="application"
      aria-label="Zen Editor"
    >
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor main area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div
            className={cn(
              "border-b flex overflow-x-auto",
              theme === "dark" && "bg-zinc-800/70 border-zinc-700/30",
              theme === "light" && "bg-white border-zinc-200",
              theme === "high-contrast" && "bg-black border-zinc-700",
              zenMode && "opacity-0 h-0 overflow-hidden transition-all duration-300",
            )}
          >
            {openTabs.map((tab) => (
              <div
                key={tab}
                className={cn(
                  "px-4 py-2 flex items-center gap-2 text-sm border-r cursor-pointer transition-all duration-200",
                  theme === "dark" && "border-zinc-700/30",
                  theme === "light" && "border-zinc-200",
                  theme === "high-contrast" && "border-zinc-700",
                  tab === activeFile
                    ? cn(
                      "border-b-2 font-medium",
                      theme === "dark" && "bg-zinc-800 text-white border-b-cyan-500",
                      theme === "light" && "bg-white text-zinc-900 border-b-cyan-600",
                      theme === "high-contrast" && "bg-zinc-900 text-white border-b-cyan-400",
                    )
                    : cn(
                      "hover:bg-opacity-50",
                      theme === "dark" && "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700",
                      theme === "light" && "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100",
                      theme === "high-contrast" && "text-zinc-400 hover:text-white hover:bg-zinc-800",
                    ),
                )}
                onClick={() => openFile(tab)}
                role="tab"
                aria-selected={tab === activeFile}
              >
                <Code className="h-3.5 w-3.5" />
                {tab.split("/").pop()}
                <button
                  className={cn(
                    "ml-1 opacity-50 hover:opacity-100 rounded-full p-0.5 transition-colors",
                    "hover:bg-red-500/20 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/40",
                  )}
                  onClick={(e) => closeTab(tab, e)}
                  aria-label={`Close ${tab.split("/").pop()} tab`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Code editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={editorLanguage}
              value={getFileContent(activeFile)}
              theme={getMonacoTheme()}
              options={{
                fontSize: fontSize,
                fontFamily: "monospace",
                minimap: { enabled: !zenMode && showMinimap },
                scrollBeyondLastLine: false,
                lineNumbers: !zenMode ? "on" : "off",
                glyphMargin: !zenMode,
                folding: !zenMode,
                lineDecorationsWidth: !zenMode ? 10 : 0,
                lineNumbersMinChars: !zenMode ? 5 : 0,
                renderLineHighlight: !zenMode ? "all" : "none",
                renderWhitespace: !zenMode ? "selection" : "none",
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                contextmenu: !zenMode,
                tabSize: tabSize,
                wordWrap: wordWrap ? "on" : "off",
                scrollbar: {
                  vertical: !zenMode ? "auto" : "hidden",
                  horizontal: !zenMode ? "auto" : "hidden",
                  verticalScrollbarSize: 10,
                  horizontalScrollbarSize: 10,
                },
                padding: {
                  top: zenMode ? 20 : 8,
                  bottom: zenMode ? 20 : 8,
                },
                automaticLayout: true,
              }}
              onMount={handleEditorDidMount}
              onChange={(value) => {
                if (activeFile && value) {
                  setFileContents((prev) => ({
                    ...prev,
                    [activeFile]: value,
                  }))
                }
              }}
            />
          </div>
        </div>

        {/* File tree sidebar (on the right) */}
        <div
          className={cn(
            "h-full backdrop-blur-sm transition-all duration-300 ease-in-out overflow-y-auto z-10",
            "border-l rounded-tl-lg shadow-lg",
            theme === "dark" && "bg-zinc-800/50 border-zinc-700/30",
            theme === "light" && "bg-white/90 border-zinc-200",
            theme === "high-contrast" && "bg-zinc-900 border-zinc-700",
            showFileTree ? (isMobile ? "w-full absolute right-0 top-0 bottom-0" : "w-1/5") : "w-0",
          )}
          role="navigation"
          aria-label="File Explorer"
        >
          <div
            className={cn(
              "p-3 sticky top-0 z-10 border-b flex items-center justify-between",
              theme === "dark" && "bg-zinc-800/80 backdrop-blur-sm border-zinc-700/30",
              theme === "light" && "bg-white/90 backdrop-blur-sm border-zinc-200",
              theme === "high-contrast" && "bg-zinc-900 border-zinc-700",
            )}
          >
            <span className="text-sm font-semibold">PROJECT FILES</span>
            <button
              className={cn(
                "p-1 rounded-md transition-colors",
                theme === "dark" && "hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200",
                theme === "light" && "hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800",
                theme === "high-contrast" && "hover:bg-zinc-800 text-zinc-400 hover:text-white",
              )}
              onClick={() => setShowFileTree(false)}
              aria-label="Close file explorer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-2" role="tree">
            {renderFileTree(fileTree)}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div
        className={cn(
          "h-7 flex items-center px-4 text-xs border-t transition-opacity duration-300",
          theme === "dark" && "bg-zinc-800 border-zinc-700/30 text-zinc-400",
          theme === "light" && "bg-white border-zinc-200 text-zinc-600",
          theme === "high-contrast" && "bg-black border-zinc-700 text-zinc-300",
          zenMode && "opacity-30 hover:opacity-100",
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-4">
          {/* Vim mode indicator */}
          <div className={cn("font-semibold", getVimModeColor())} aria-label={`Vim mode: ${vimMode}`}>
            {vimMode}
          </div>

          {/* File path */}
          <div title={activeFile}>{activeFile}</div>

          {/* Line and column */}
          <div>
            Ln {cursorPosition.line}, Col {cursorPosition.column}
          </div>
        </div>

        {/* Right side status items */}
        <div className="ml-auto flex items-center gap-4">
          {/* Zen mode indicator */}
          <div className="flex items-center gap-1.5" aria-label={zenMode ? "Zen Mode active" : "Normal Mode active"}>
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                theme === "dark" && "bg-cyan-500",
                theme === "light" && "bg-cyan-600",
                theme === "high-contrast" && "bg-cyan-400",
                breatheAnimation && "animate-pulse",
              )}
            />
            <span>{zenMode ? "Zen Mode" : "Normal Mode"}</span>
          </div>

          <div>{editorLanguage === "typescript" ? "TypeScript" : editorLanguage}</div>

          <div>UTF-8</div>
        </div>
      </div>

      {/* Floating UI elements */}
      {/* File tree toggle button (when hidden) */}
      {!showFileTree && (
        <button
          className={cn(
            "absolute top-4 right-4 p-2 rounded-md shadow-md group z-20",
            theme === "dark" && "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200",
            theme === "light" && "bg-white/90 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-800",
            theme === "high-contrast" && "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white",
            zenMode && "opacity-0 pointer-events-none",
          )}
          onClick={() => setShowFileTree(true)}
          aria-label="Show file explorer"
        >
          <Menu className="h-5 w-5" />
          <div
            className={cn(
              "absolute right-full mr-2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity",
              theme === "dark" && "bg-zinc-800",
              theme === "light" && "bg-white border border-zinc-200",
              theme === "high-contrast" && "bg-zinc-900",
            )}
          >
            Toggle Explorer (Ctrl+B)
          </div>
        </button>
      )}

      {/* Command palette button */}
      <button
        className={cn(
          "absolute top-4 left-4 p-2 rounded-md shadow-md group z-20",
          theme === "dark" && "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200",
          theme === "light" && "bg-white/90 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-800",
          theme === "high-contrast" && "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white",
          zenMode && "opacity-0 pointer-events-none",
        )}
        onClick={() => setShowCommandPalette(true)}
        aria-label="Open command palette"
      >
        <Command className="h-5 w-5" />
        <div
          className={cn(
            "absolute left-full ml-2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity",
            theme === "dark" && "bg-zinc-800",
            theme === "light" && "bg-white border border-zinc-200",
            theme === "high-contrast" && "bg-zinc-900",
          )}
        >
          Command Palette (Ctrl+P)
        </div>
      </button>

      {/* Settings button */}
      <button
        className={cn(
          "absolute top-16 left-4 p-2 rounded-md shadow-md group z-20",
          theme === "dark" && "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200",
          theme === "light" && "bg-white/90 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-800",
          theme === "high-contrast" && "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white",
          zenMode && "opacity-0 pointer-events-none",
        )}
        onClick={() => setShowSettings(true)}
        aria-label="Open settings"
      >
        <Settings className="h-5 w-5" />
        <div
          className={cn(
            "absolute left-full ml-2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity",
            theme === "dark" && "bg-zinc-800",
            theme === "light" && "bg-white border border-zinc-200",
            theme === "high-contrast" && "bg-zinc-900",
          )}
        >
          Settings (Ctrl+,)
        </div>
      </button>

      {/* Zen mode toggle button */}
      <button
        className={cn(
          "absolute top-28 left-4 p-2 rounded-md shadow-md group z-20",
          theme === "dark" && "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200",
          theme === "light" && "bg-white/90 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-800",
          theme === "high-contrast" && "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white",
        )}
        onClick={toggleZenMode}
        aria-label={zenMode ? "Exit zen mode" : "Enter zen mode"}
      >
        {zenMode ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        <div
          className={cn(
            "absolute left-full ml-2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity",
            theme === "dark" && "bg-zinc-800",
            theme === "light" && "bg-white border border-zinc-200",
            theme === "high-contrast" && "bg-zinc-900",
          )}
        >
          Toggle Zen Mode (Ctrl+Shift+Z)
        </div>
      </button>

      {/* Keyboard shortcuts button */}
      <button
        className={cn(
          "absolute top-40 left-4 p-2 rounded-md shadow-md group z-20",
          theme === "dark" && "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200",
          theme === "light" && "bg-white/90 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-800",
          theme === "high-contrast" && "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white",
          zenMode && "opacity-0 pointer-events-none",
        )}
        onClick={() => {
          // Show keyboard shortcuts modal (not implemented in this demo)
          alert("Keyboard shortcuts would be shown here")
        }}
        aria-label="Show keyboard shortcuts"
      >
        <Keyboard className="h-5 w-5" />
        <div
          className={cn(
            "absolute left-full ml-2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity",
            theme === "dark" && "bg-zinc-800",
            theme === "light" && "bg-white border border-zinc-200",
            theme === "high-contrast" && "bg-zinc-900",
          )}
        >
          Keyboard Shortcuts
        </div>
      </button>

      {/* Harpoon navigation */}
      <div
        className={cn(
          "absolute bottom-12 left-1/2 -translate-x-1/2 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg flex items-center gap-3 group transition-all duration-300 z-20",
          theme === "dark" && "bg-zinc-800/80",
          theme === "light" && "bg-white/90 border border-zinc-200",
          theme === "high-contrast" && "bg-zinc-900",
          zenMode && "opacity-30 hover:opacity-100",
        )}
        role="navigation"
        aria-label="Harpoon file navigation"
      >
        {harpoonFiles.map((file, index) => (
          <button
            key={file}
            className={cn(
              "h-3 w-3 rounded-full transition-all focus:outline-none focus:ring-2",
              file === activeFile
                ? cn(
                  "scale-125",
                  theme === "dark" && "bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.6)] focus:ring-cyan-400/50",
                  theme === "light" && "bg-cyan-600 shadow-[0_0_8px_rgba(8,145,178,0.6)] focus:ring-cyan-500/50",
                  theme === "high-contrast" &&
                  "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] focus:ring-cyan-300/50",
                )
                : cn(
                  theme === "dark" && "bg-zinc-600 hover:bg-zinc-500 focus:ring-zinc-400/50",
                  theme === "light" && "bg-zinc-300 hover:bg-zinc-400 focus:ring-zinc-300/50",
                  theme === "high-contrast" && "bg-zinc-700 hover:bg-zinc-600 focus:ring-zinc-500/50",
                ),
            )}
            onClick={() => openFile(file)}
            aria-label={`Open ${file}`}
            aria-current={file === activeFile ? "true" : "false"}
          >
            <span className="sr-only">{file}</span>
          </button>
        ))}
        <div
          className={cn(
            "absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity",
            theme === "dark" && "bg-zinc-800",
            theme === "light" && "bg-white border border-zinc-200",
            theme === "high-contrast" && "bg-zinc-900",
          )}
        >
          Harpoon (Ctrl+H,J,K,L)
        </div>
      </div>

      {/* Command palette */}
      {showCommandPalette && (
        <div
          className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[20vh] z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="command-palette-title"
        >
          <div
            className={cn(
              "w-[600px] rounded-lg shadow-xl overflow-hidden",
              theme === "dark" && "bg-zinc-800",
              theme === "light" && "bg-white",
              theme === "high-contrast" && "bg-zinc-900",
            )}
            ref={settingsRef}
          >
            <div
              className={cn(
                "p-4 border-b",
                theme === "dark" && "border-zinc-700",
                theme === "light" && "border-zinc-200",
                theme === "high-contrast" && "border-zinc-700",
              )}
            >
              <div className="flex items-center">
                <Command className="h-5 w-5 mr-2 text-zinc-400" />
                <input
                  type="text"
                  className={cn(
                    "flex-1 bg-transparent border-none outline-none placeholder-zinc-500",
                    theme === "dark" && "text-white",
                    theme === "light" && "text-zinc-900",
                    theme === "high-contrast" && "text-white",
                  )}
                  placeholder="Search files or commands..."
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setShowCommandPalette(false)
                    }
                  }}
                  ref={commandInputRef}
                  id="command-palette-title"
                />
                <button
                  className={cn(
                    "hover:text-white",
                    theme === "dark" && "text-zinc-400 hover:text-white",
                    theme === "light" && "text-zinc-600 hover:text-zinc-900",
                    theme === "high-contrast" && "text-zinc-400 hover:text-white",
                  )}
                  onClick={() => setShowCommandPalette(false)}
                  aria-label="Close command palette"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <div className="p-2">
                <div
                  className={cn(
                    "text-xs px-2 py-1",
                    theme === "dark" && "text-zinc-500",
                    theme === "light" && "text-zinc-600",
                    theme === "high-contrast" && "text-zinc-500",
                  )}
                >
                  Files
                </div>
                {commandPaletteResults.length > 0 ? (
                  commandPaletteResults.map((file, index) => (
                    <div
                      key={file}
                      className={cn(
                        "flex items-center px-3 py-2 rounded-md cursor-pointer",
                        index === selectedCommandIndex
                          ? cn(
                            theme === "dark" && "bg-zinc-700 text-white",
                            theme === "light" && "bg-zinc-100 text-zinc-900",
                            theme === "high-contrast" && "bg-zinc-800 text-white",
                          )
                          : cn(
                            theme === "dark" && "hover:bg-zinc-700/50 text-zinc-300",
                            theme === "light" && "hover:bg-zinc-100 text-zinc-700",
                            theme === "high-contrast" && "hover:bg-zinc-800 text-zinc-300",
                          ),
                      )}
                      onClick={() => {
                        openFile(file)
                        setShowCommandPalette(false)
                      }}
                      onMouseEnter={() => setSelectedCommandIndex(index)}
                      role="option"
                      aria-selected={index === selectedCommandIndex}
                    >
                      <FileText className="h-4 w-4 mr-2 text-zinc-400" />
                      <span>{file}</span>
                    </div>
                  ))
                ) : searchTerm ? (
                  <div
                    className={cn(
                      "px-3 py-2 text-sm",
                      theme === "dark" && "text-zinc-400",
                      theme === "light" && "text-zinc-500",
                      theme === "high-contrast" && "text-zinc-400",
                    )}
                  >
                    No files found matching "{searchTerm}"
                  </div>
                ) : (
                  <div
                    className={cn(
                      "px-3 py-2 text-sm",
                      theme === "dark" && "text-zinc-400",
                      theme === "light" && "text-zinc-500",
                      theme === "high-contrast" && "text-zinc-400",
                    )}
                  >
                    Type to search for files
                  </div>
                )}
              </div>
              <div className="p-2">
                <div
                  className={cn(
                    "text-xs px-2 py-1",
                    theme === "dark" && "text-zinc-500",
                    theme === "light" && "text-zinc-600",
                    theme === "high-contrast" && "text-zinc-500",
                  )}
                >
                  Commands
                </div>
                <div
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md cursor-pointer",
                    theme === "dark" && "hover:bg-zinc-700/50",
                    theme === "light" && "hover:bg-zinc-100",
                    theme === "high-contrast" && "hover:bg-zinc-800",
                  )}
                  onClick={() => {
                    toggleZenMode()
                    setShowCommandPalette(false)
                  }}
                  role="option"
                >
                  {zenMode ? (
                    <Minimize className="h-4 w-4 mr-2 text-zinc-400" />
                  ) : (
                    <Maximize className="h-4 w-4 mr-2 text-zinc-400" />
                  )}
                  <span>Toggle Zen Mode</span>
                  <span
                    className={cn(
                      "ml-auto text-xs",
                      theme === "dark" && "text-zinc-500",
                      theme === "light" && "text-zinc-500",
                      theme === "high-contrast" && "text-zinc-500",
                    )}
                  >
                    Ctrl+Shift+Z
                  </span>
                </div>
                <div
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md cursor-pointer",
                    theme === "dark" && "hover:bg-zinc-700/50",
                    theme === "light" && "hover:bg-zinc-100",
                    theme === "high-contrast" && "hover:bg-zinc-800",
                  )}
                  onClick={() => {
                    setShowFileTree(!showFileTree)
                    setShowCommandPalette(false)
                  }}
                  role="option"
                >
                  <Menu className="h-4 w-4 mr-2 text-zinc-400" />
                  <span>Toggle File Explorer</span>
                  <span
                    className={cn(
                      "ml-auto text-xs",
                      theme === "dark" && "text-zinc-500",
                      theme === "light" && "text-zinc-500",
                      theme === "high-contrast" && "text-zinc-500",
                    )}
                  >
                    Ctrl+B
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
        >
          <div
            className={cn(
              "w-[700px] rounded-lg shadow-xl overflow-hidden",
              theme === "dark" && "bg-zinc-800",
              theme === "light" && "bg-white",
              theme === "high-contrast" && "bg-zinc-900",
            )}
            ref={settingsRef}
          >
            <div
              className={cn(
                "flex items-center justify-between p-4 border-b",
                theme === "dark" && "border-zinc-700",
                theme === "light" && "border-zinc-200",
                theme === "high-contrast" && "border-zinc-700",
              )}
            >
              <h2 className="text-lg font-semibold" id="settings-title">
                Settings
              </h2>
              <button
                className={cn(
                  theme === "dark" && "text-zinc-400 hover:text-white",
                  theme === "light" && "text-zinc-600 hover:text-zinc-900",
                  theme === "high-contrast" && "text-zinc-400 hover:text-white",
                )}
                onClick={() => setShowSettings(false)}
                aria-label="Close settings"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-2">Editor</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label htmlFor="fontSize" className="text-sm">
                        Font Size
                      </label>
                      <select
                        id="fontSize"
                        className={cn(
                          "rounded px-2 py-1 text-sm",
                          theme === "dark" && "bg-zinc-700 border border-zinc-600",
                          theme === "light" && "bg-zinc-100 border border-zinc-300",
                          theme === "high-contrast" && "bg-zinc-800 border border-zinc-600",
                        )}
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                      >
                        <option value={12}>12px</option>
                        <option value={14}>14px</option>
                        <option value={16}>16px</option>
                        <option value={18}>18px</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="tabSize" className="text-sm">
                        Tab Size
                      </label>
                      <select
                        id="tabSize"
                        className={cn(
                          "rounded px-2 py-1 text-sm",
                          theme === "dark" && "bg-zinc-700 border border-zinc-600",
                          theme === "light" && "bg-zinc-100 border border-zinc-300",
                          theme === "high-contrast" && "bg-zinc-800 border border-zinc-600",
                        )}
                        value={tabSize}
                        onChange={(e) => setTabSize(Number(e.target.value))}
                      >
                        <option value={2}>2 spaces</option>
                        <option value={4}>4 spaces</option>
                        <option value={8}>8 spaces</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="wordWrap" className="text-sm">
                        Word Wrap
                      </label>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="wordWrap"
                          className="mr-2"
                          checked={wordWrap}
                          onChange={() => setWordWrap(!wordWrap)}
                        />
                        <label htmlFor="wordWrap" className="text-sm">
                          Enable
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Appearance</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label htmlFor="theme" className="text-sm">
                        Theme
                      </label>
                      <div className="flex gap-2">
                        <button
                          className={cn(
                            "p-2 rounded-md flex items-center justify-center",
                            theme === "dark"
                              ? "bg-zinc-700 text-white ring-2 ring-cyan-500"
                              : "bg-zinc-800 text-zinc-400 hover:text-white",
                          )}
                          onClick={() => setTheme("dark")}
                          aria-label="Dark theme"
                          aria-pressed={theme === "dark"}
                        >
                          <Moon className="h-4 w-4" />
                        </button>
                        <button
                          className={cn(
                            "p-2 rounded-md flex items-center justify-center",
                            theme === "light"
                              ? "bg-white text-zinc-900 ring-2 ring-cyan-500"
                              : "bg-zinc-100 text-zinc-600 hover:text-zinc-900",
                          )}
                          onClick={() => setTheme("light")}
                          aria-label="Light theme"
                          aria-pressed={theme === "light"}
                        >
                          <Sun className="h-4 w-4" />
                        </button>
                        <button
                          className={cn(
                            "p-2 rounded-md flex items-center justify-center",
                            theme === "high-contrast"
                              ? "bg-black text-white ring-2 ring-cyan-500"
                              : "bg-zinc-900 text-zinc-400 hover:text-white",
                          )}
                          onClick={() => setTheme("high-contrast")}
                          aria-label="High contrast theme"
                          aria-pressed={theme === "high-contrast"}
                        >
                          <Laptop className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="breatheAnimation" className="text-sm">
                        Zen Mode Animation
                      </label>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="breatheAnimation"
                          className="mr-2"
                          checked={breatheAnimation}
                          onChange={() => setBreatheAnimation(!breatheAnimation)}
                        />
                        <label htmlFor="breatheAnimation" className="text-sm">
                          Enable breathing animation
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="minimap" className="text-sm">
                        Minimap
                      </label>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="minimap"
                          className="mr-2"
                          checked={showMinimap}
                          onChange={() => setShowMinimap(!showMinimap)}
                        />
                        <label htmlFor="minimap" className="text-sm">
                          Show minimap
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Vim Mode</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label htmlFor="vimMode" className="text-sm">
                        Enable Vim Mode
                      </label>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="vimMode"
                          className="mr-2"
                          checked={vimModeEnabled}
                          onChange={() => setVimModeEnabled(!vimModeEnabled)}
                        />
                        <label htmlFor="vimMode" className="text-sm">
                          Enable
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Normal Mode Color</label>
                      <div className="w-6 h-6 rounded bg-green-400"></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Insert Mode Color</label>
                      <div className="w-6 h-6 rounded bg-blue-400"></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Visual Mode Color</label>
                      <div className="w-6 h-6 rounded bg-red-400"></div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Harpoon</h3>
                  <div className="space-y-3">
                    {harpoonFiles.map((file, index) => (
                      <div key={file} className="flex items-center justify-between">
                        <label className="text-sm">
                          Shortcut {index + 1} (Ctrl+{String.fromCharCode(72 + index)})
                        </label>
                        <div className="flex-1 mx-4">
                          <input
                            type="text"
                            value={file}
                            className={cn(
                              "w-full rounded px-2 py-1 text-sm",
                              theme === "dark" && "bg-zinc-700 border border-zinc-600",
                              theme === "light" && "bg-zinc-100 border border-zinc-300",
                              theme === "high-contrast" && "bg-zinc-800 border border-zinc-600",
                            )}
                            onChange={(e) => {
                              const newHarpoonFiles = [...harpoonFiles]
                              newHarpoonFiles[index] = e.target.value
                              setHarpoonFiles(newHarpoonFiles)
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div
              className={cn(
                "flex justify-end p-4 border-t",
                theme === "dark" && "border-zinc-700",
                theme === "light" && "border-zinc-200",
                theme === "high-contrast" && "border-zinc-700",
              )}
            >
              <button
                className={cn(
                  "px-4 py-2 rounded-md mr-2",
                  theme === "dark" && "bg-zinc-700 hover:bg-zinc-600",
                  theme === "light" && "bg-zinc-200 hover:bg-zinc-300",
                  theme === "high-contrast" && "bg-zinc-800 hover:bg-zinc-700",
                )}
                onClick={() => setShowSettings(false)}
              >
                Cancel
              </button>
              <button
                className={cn(
                  "px-4 py-2 rounded-md",
                  theme === "dark" && "bg-cyan-600 hover:bg-cyan-500",
                  theme === "light" && "bg-cyan-600 hover:bg-cyan-500 text-white",
                  theme === "high-contrast" && "bg-cyan-600 hover:bg-cyan-500",
                )}
                onClick={() => {
                  applyEditorSettings()
                  setShowSettings(false)
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Sample code for Button component
function getSampleButtonCode() {
  return `import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'outline' && 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-10 px-4 py-2',
        size === 'lg' && 'h-12 px-6 py-3 text-lg',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}`
}

// Sample code for Card component
function getSampleCardCode() {
  return `import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props}>
      {children}
    </div>
  );
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h3 className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props}>
      {children}
    </h3>
  );
}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function CardDescription({ className, children, ...props }: CardDescriptionProps) {
  return (
    <p className={cn('text-sm text-zinc-500 dark:text-zinc-400', className)} {...props}>
      {children}
    </p>
  );
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div className={cn('p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div className={cn('flex items-center p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}`
}

// Sample code for utils.ts
function getSampleUtilsCode() {
  return `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names into a single string, merging Tailwind CSS classes properly.
 * @param inputs - Class names to combine
 * @returns Merged class names string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date into a readable string
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }
) {
  return new Intl.DateTimeFormat('en-US', {
    ...options,
  }).format(date);
}

/**
 * Truncates a string to a specified length and adds an ellipsis
 * @param str - String to truncate
 * @param length - Maximum length
 * @returns Truncated string
 */
export function truncate(str: string, length: number) {
  if (!str || str.length <= length) return str;
  return \`\${str.slice(0, length)}\u2026\`;
}

/**
 * Generates a random ID
 * @returns Random ID string
 */
export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}`
}

// Sample code for page.tsx
function getSamplePageCode() {
  return `import { Button } from '@/components/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/Card';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">Welcome to My App</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
              <CardDescription>Explore what our app has to offer</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2">
                <li>Responsive design</li>
                <li>Dark mode support</li>
                <li>Accessibility features</li>
                <li>Performance optimizations</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button>Learn More</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Quick steps to begin using the app</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Follow these simple steps to get started with our application:</p>
              <ol className="list-decimal pl-5 mt-2 space-y-2">
                <li>Create an account</li>
                <li>Set up your profile</li>
                <li>Explore the dashboard</li>
                <li>Start your first project</li>
              </ol>
            </CardContent>
            <CardFooter>
              <Button variant="outline">Documentation</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
}`
}

