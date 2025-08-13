"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MessageCircle,
  Users,
  Settings,
  Bell,
  Search,
  Plus,
  MoreVertical,
  Circle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { ChatInterface } from "@/components/chat/chat-interface";

interface Conversation {
  id: string;
  customerName: string;
  lastMessage: string;
  timestamp: Date;
  isUnread: boolean;
  status: "waiting" | "active" | "resolved";
  customerAvatar?: string;
}

interface DashboardLayoutProps {
  isSupport?: boolean;
}

export function DashboardLayout({ isSupport = false }: DashboardLayoutProps) {
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >("1");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const conversations: Conversation[] = [
    {
      id: "1",
      customerName: "John Doe",
      lastMessage: "I need help with my account login",
      timestamp: new Date(Date.now() - 300000),
      isUnread: true,
      status: "active",
    },
    {
      id: "2",
      customerName: "Sarah Johnson",
      lastMessage: "Thank you for your help!",
      timestamp: new Date(Date.now() - 900000),
      isUnread: false,
      status: "resolved",
    },
    {
      id: "3",
      customerName: "Mike Wilson",
      lastMessage: "Is anyone available to help?",
      timestamp: new Date(Date.now() - 1800000),
      isUnread: true,
      status: "waiting",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "text-yellow-500";
      case "active":
        return "text-green-500";
      case "resolved":
        return "text-gray-500";
      default:
        return "text-gray-500";
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  return (
    <div className="h-screen bg-background flex">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "w-80" : "w-0"} transition-all duration-300 border-r border-border bg-card flex flex-col overflow-hidden`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-primary-foreground">
                  V
                </span>
              </div>
              <span className="text-lg font-bold text-foreground">Voxora</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search conversations..." className="pl-10" />
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 border-b border-border">
          <nav className="space-y-2">
            <Button variant="secondary" className="w-full justify-start">
              <MessageCircle className="mr-2 h-4 w-4" />
              Conversations
              <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full px-2 py-1">
                {conversations.filter((c) => c.isUnread).length}
              </span>
            </Button>
            {isSupport && (
              <>
                <Button variant="ghost" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Team
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </>
            )}
          </nav>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">
                Recent Conversations
              </h3>
              <Button size="icon" variant="ghost">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {conversations.map((conversation) => (
                <Card
                  key={conversation.id}
                  className={`cursor-pointer transition-colors hover:bg-accent ${
                    selectedConversation === conversation.id ? "bg-accent" : ""
                  }`}
                  onClick={() => setSelectedConversation(conversation.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-sm text-foreground truncate">
                            {conversation.customerName}
                          </h4>
                          <Circle
                            className={`h-2 w-2 fill-current ${getStatusColor(conversation.status)}`}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {conversation.lastMessage}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(conversation.timestamp)}
                        </p>
                      </div>

                      <div className="flex flex-col items-end space-y-1">
                        {conversation.isUnread && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">
                  {isSupport ? "SA" : "JD"}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isSupport ? "Support Agent" : "John Doe"}
                </p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-16 border-b border-border bg-background flex items-center justify-between px-4">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}

          <div className="flex items-center space-x-4 ml-auto">
            <Button variant="ghost" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 p-4">
          {selectedConversation ? (
            <ChatInterface
              conversationId={selectedConversation}
              isSupport={isSupport}
            />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No conversation selected
                </h3>
                <p className="text-muted-foreground">
                  Select a conversation from the sidebar to start chatting
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
