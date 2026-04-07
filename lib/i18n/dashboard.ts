import type { Locale } from "@/lib/i18n/locales";

export type DashboardCopy = {
  shell: {
    eyebrow: string;
    title: string;
    description: string;
    signOut: string;
    ready: string;
    chips: {
      hookFirst: string;
      singlePost: string;
      platforms: string;
    };
    sections: {
      accounts: string;
      accountInventory: string;
      accountInventoryDescription: string;
    };
    stats: {
      signals: string;
      hooks: string;
      scheduled: string;
      accounts: string;
    };
    rail: {
      title: string;
      heading: string;
      description: string;
      helper: string;
      signals: string;
      hooks: string;
      queue: string;
    };
    banners: {
      connected: string;
      scheduled: string;
      hooks: string;
      actionFailed: string;
    };
      accounts: {
        total: string;
        empty: string;
        updatedPrefix: string;
        unnamed: string;
      };
    connect: {
      xTitle: string;
      xDescription: string;
      threadsTitle: string;
      threadsDescription: string;
    };
  };
  sidebar: {
    brand: string;
    workspace: string;
    workspaceName: string;
    createPostBtn: string;
    sections: {
      create: string;
      posts: string;
      workspace: string;
      configuration: string;
    };
    nav: {
      newPost: string;
      studio: string;
      bulkTools: string;
      calendar: string;
      allPosts: string;
      scheduled: string;
      posted: string;
      drafts: string;
      analytics: string;
      commentsManagement: string;
      workspaces: string;
      connections: string;
      settings: string;
      billing: string;
    };
    workspaceMenu: {
      label: string;
      manage: string;
      create: string;
    };
    language: string;
    signOut: string;
  };
  pages: {
    compose: {
      title: string;
      noThreadsAccounts: string;
      draftsGenerated: string;
      published: string;
      publishedPartial: string;
      scheduled: string;
      draftSaved: string;
      missingConnectedAccount: string;
      missingAccountKeywords: string;
      noViralPosts: string;
      ingestionUnavailable: string;
      draftGenerationFailed: string;
      genericError: string;
      publishFailed: string;
    };
    posts: {
      title: string;
      newest: string;
      platform: string;
      time: string;
      accounts: string;
      info: string;
      empty: string;
      cancel: string;
    };
    scheduled: {
      title: string;
      newest: string;
      platform: string;
      time: string;
      accounts: string;
      info: string;
      empty: string;
      cancel: string;
    };
    posted: {
      titlePublished: string;
      titleFailed: string;
      titleDeleted: string;
      newest: string;
      oldest: string;
      allPlatforms: string;
      allTime: string;
      last7Days: string;
      last30Days: string;
      allAccounts: string;
      threadsOnly: string;
      xOnly: string;
      deleted: string;
      postedBadge: string;
      failedBadge: string;
      deletedBadge: string;
      noItemsPublished: string;
      noItemsFailed: string;
      noItemsDeleted: string;
      type: string;
      tabPublished: string;
      tabFailed: string;
      tabDeleted: string;
      toastDeleted: string;
      toastExternallyDeleted: string;
      toastSyncDeletedSingle: string;
      toastSyncDeletedPlural: string;
      toastDeleteScopeRequired: string;
      toastDeleteFailed: string;
      toastMigrationRequired: string;
    };
    drafts: {
      title: string;
      empty: string;
      draft: string;
      published: string;
      scheduled: string;
      deleted: string;
      error: string;
    };
    comments: {
      eyebrow: string;
      title: string;
      description: string;
      filtersTitle: string;
      activeWorkspace: string;
      accountLabel: string;
      allAccounts: string;
      sortLabel: string;
      newest: string;
      oldest: string;
      minUnansweredLabel: string;
      includeRepliedLabel: string;
      refresh: string;
      publishedPostsCount: string;
      contentTitle: string;
      visibleCommentsTemplate: string;
      repliesSubmitHint: string;
      noCommentsMatching: string;
      noPublishedPosts: string;
      demoNotice: string;
      sampleBadge: string;
      repliedBadge: string;
      unansweredBadge: string;
      openComment: string;
      writeReplyPlaceholder: string;
      replyHint: string;
      replyButton: string;
      publishedPostLabel: string;
      commentsUnansweredTemplate: string;
      toastReplySent: string;
      errorsMissingFields: string;
      errorsInvalidWorkspace: string;
      errorsInvalidPost: string;
      errorsInvalidAccount: string;
      errorsMissingToken: string;
      errorsMissingScope: string;
      errorsReplyFailed: string;
      errorsGeneric: string;
      noTextProvided: string;
      threadsUser: string;
    };
    connections: {
      eyebrow: string;
      title: string;
      description: string;
      connect: string;
      reconnect: string;
      disconnect: string;
      connected: string;
      disconnected: string;
      genericError: string;
      noAccounts: string;
      connectedAt: string;
      status: {
        active: string;
        expired: string;
        revoked: string;
        error: string;
      };
    };
    settings: {
      title: string;
      description: string;
      tabs: {
        settings: string;
        queue: string;
        billing: string;
        plans: string;
      };
      overview: {
        title: string;
        description: string;
        currentWorkspace: string;
        manageWorkspaces: string;
      };
      profile: {
        title: string;
        displayNameLabel: string;
        displayNameHint: string;
        emailLabel: string;
        save: string;
      };
      account: {
        title: string;
        currentEmail: string;
        emailPlaceholder: string;
        changeEmail: string;
        passwordTitle: string;
        passwordPlaceholder: string;
        changePassword: string;
        sendReset: string;
      };
      security: {
        title: string;
        description: string;
        signOutAll: string;
      };
      emailPreferences: {
        title: string;
        automationTitle: string;
        automationDescription: string;
        failureTitle: string;
        failureDescription: string;
        deliveryNote: string;
        save: string;
      };
      feedback: {
        profileSaved: string;
        emailRequested: string;
        passwordSaved: string;
        resetSent: string;
        preferencesSaved: string;
        invalidDisplayName: string;
        invalidEmail: string;
        invalidPassword: string;
        profileFailed: string;
        emailFailed: string;
        passwordFailed: string;
        resetFailed: string;
        preferencesFailed: string;
        preferencesUnavailable: string;
        signoutFailed: string;
      };
      queue: {
        title: string;
        description: string;
        timezone: string;
        sourceMode: string;
        aiType: string;
        accounts: string;
        accountsAll: string;
        accountsNone: string;
        accountsSelected: string;
        noConnectedAccounts: string;
        informational: string;
        engagement: string;
        product: string;
        aiRandom: string;
        draftRandom: string;
        randomizePostingTime: string;
        randomizeDescription: string;
        addTime: string;
        removeTime: string;
        active: string;
        inactive: string;
        timeLabel: string;
        activeSlots: string;
        rowCount: string;
        save: string;
        saving: string;
        saved: string;
        failed: string;
        weekdaysShort: string[];
      };
      billing: {
        title: string;
        description: string;
        comingSoon: string;
        currentPlanTitle: string;
        planName: string;
        planPrice: string;
        planStatus: string;
        includedTitle: string;
        includedAccounts: string;
        includedWorkspaces: string;
        includedQueue: string;
        usageTitle: string;
        usagePosts: string;
        usageDrafts: string;
        paymentTitle: string;
        paymentDescription: string;
        paymentCta: string;
        invoicesTitle: string;
        invoicesEmpty: string;
        invoicesUpdated: string;
      };
      plans: {
        title: string;
        description: string;
        comingSoon: string;
      };
    };
    bulk: {
      title: string;
      subtitle: string;
      drafts: string;
      selectAll: string;
      config: string;
      interval: string;
      intervalHelper: string;
      exclusion: string;
      exclusionStart: string;
      exclusionEnd: string;
      saveQueue: string;
    };
    calendar: {
      title: string;
      month: string;
      week: string;
      jumpToday: string;
      noPostsForDay: string;
      scheduled: string;
      published: string;
      failed: string;
      draft: string;
      more: string;
      postsOn: string;
      noAccess: string;
      unavailable: string;
      noContent: string;
      synced: string;
      weekdaysShort: string[];
      dateFormat: string;
      timeFormat: string;
    };
    workspaces: {
      title: string;
      description: string;
      currentBadge: string;
      noKeywords: string;
      createWorkspace: string;
      createEditorTitle: string;
      createEditorDescription: string;
      editorDescription: string;
      backToAllWorkspaces: string;
      setCurrent: string;
      activeNow: string;
      workspaceName: string;
      keywords: string;
      targetAudience: string;
      productLink: string;
      commonInstruction: string;
      typePoints: string;
      informationalFocus: string;
      engagementFocus: string;
      productFocus: string;
      save: string;
      createAndSave: string;
      basics: string;
      strategy: string;
      placeholderWorkspace: string;
      placeholderKeyword: string;
      placeholderTargetAudience: string;
      placeholderProductLink: string;
      placeholderCommonInstruction: string;
      placeholderInfo: string;
      placeholderEngagement: string;
      placeholderProduct: string;
      created: string;
      saved: string;
    };
  };
  hook: {
    eyebrow: string;
    title: string;
    description: string;
    helper: string;
    generate: string;
    categories: string;
    keyword: string;
    keywordPlaceholder: string;
    preview: string;
    previewHeading: string;
    recent: string;
    recentHeading: string;
    previewEmpty: string;
    recentEmpty: string;
    saved: string;
    matches: string;
    total: string;
    virality: string;
    seedPost: string;
    openSource: string;
    unknown: string;
  };
  scheduler: {
    eyebrow: string;
    title: string;
    description: string;
    helper: string;
    account: string;
    postText: string;
    postPlaceholder: string;
    scheduledTime: string;
    action: string;
    queueTitle: string;
    queueHeading: string;
    queueDescription: string;
    queueEmpty: string;
    publishingAccounts: string;
    queueItems: string;
    connectAccountFirst: string;
    lastRun: string;
    lastAttempted: string;
    openPublishedPost: string;
    items: string;
  };
  common: {
    active: string;
    expired: string;
    revoked: string;
    error: string;
    draft: string;
    scheduled: string;
    processing: string;
    published: string;
    failed: string;
    cancelled: string;
    running: string;
    success: string;
  };
  errors: Record<string, string>;
};

const DASHBOARD_COPY: Record<Locale, DashboardCopy> = {
  en: {
    shell: {
      eyebrow: "Workspace",
      title: "Turn viral signals into scheduled posts.",
      description:
        "Hook Studio stays front and center. Search source posts, generate hooks, and queue a single post when you are ready.",
      signOut: "Sign out",
      ready: "Ready workspace",
      chips: {
        hookFirst: "Hook-first workspace",
        singlePost: "Single-post scheduling",
        platforms: "X + Threads ready",
      },
      sections: {
        accounts: "Connected accounts",
        accountInventory: "Account inventory",
        accountInventoryDescription:
          "Keep X and Threads accounts connected here. Publishing actions use these records without reopening setup.",
      },
      stats: {
        signals: "Signal previews",
        hooks: "Saved hooks",
        scheduled: "Queued posts",
        accounts: "Active connections",
      },
      rail: {
        title: "Workspace snapshot",
        heading: "Keep the workflow visible.",
        description:
          "This side rail keeps the core loop visible: search signals, refine hooks, then schedule a post.",
        helper:
          "The rail stays lightweight so Hook Studio remains the primary workspace.",
        signals: "Signals",
        hooks: "Hooks",
        queue: "Queue",
      },
      banners: {
        connected: "Connected successfully:",
        scheduled: "Scheduled post queued successfully.",
        hooks: "Generated and saved new hook ideas.",
        actionFailed: "Action failed:",
      },
      accounts: {
        total: "total",
        empty: "No accounts connected yet.",
        updatedPrefix: "Updated",
        unnamed: "Unnamed",
      },
      connect: {
        xTitle: "Connect X",
        xDescription: "Link an X account for scheduling and publishing.",
        threadsTitle: "Connect Threads",
        threadsDescription:
          "Link a Threads account for scheduling and publishing.",
      },
    },
    sidebar: {
      brand: "Hustle Post",
      workspace: "Workspace",
      workspaceName: "main",
      createPostBtn: "Create post",
      sections: {
        create: "Create",
        posts: "Posts",
        workspace: "Workspace",
        configuration: "Configuration",
      },
      nav: {
        newPost: "New post",
        studio: "Studio",
        bulkTools: "Bulk tools",
        calendar: "Calendar",
        allPosts: "All",
        scheduled: "Scheduled",
        posted: "Posted",
        drafts: "Drafts",
        analytics: "Analytics",
        commentsManagement: "Comments",
        workspaces: "Workspaces",
        connections: "Connections",
        settings: "Settings",
        billing: "Billing",
      },
      workspaceMenu: {
        label: "Workspace",
        manage: "Manage Workspaces",
        create: "New Workspace",
      },
      language: "Language",
      signOut: "Sign out",
    },
    pages: {
      compose: {
        title: "Create text post",
        noThreadsAccounts: "Connect a Threads account first.",
        draftsGenerated: "Drafts were generated. You can edit them below right away.",
        published: "The draft was published to the selected accounts.",
        publishedPartial:
          "The draft published to some accounts, but failed on others. Review Posted for details.",
        scheduled: "The draft was scheduled for the selected accounts.",
        draftSaved: "The draft was saved for the selected accounts.",
        missingConnectedAccount: "Choose which Threads account to use at the top first.",
        missingAccountKeywords:
          "This workspace has no saved keywords yet. Save up to three keywords in workspace settings first.",
        noViralPosts: "No usable viral posts are available yet. Try again shortly.",
        ingestionUnavailable: "The ingestion worker is currently locked or unavailable. Try again shortly.",
        draftGenerationFailed: "Draft generation failed. Try again with lighter customization.",
        genericError: "An unexpected error occurred.",
        publishFailed: "Publishing failed. Review Posted for failed deliveries.",
      },
      posts: {
        title: "All Posts",
        newest: "Newest First",
        platform: "All Platforms",
        time: "All Time",
        accounts: "All Accounts",
        info: "Info",
        empty: "No posts yet.",
        cancel: "Cancel",
      },
      scheduled: {
        title: "Scheduled",
        newest: "Newest First",
        platform: "All Platforms",
        time: "All Time",
        accounts: "All Accounts",
        info: "Info",
        empty: "No scheduled items yet.",
        cancel: "Cancel",
      },
      posted: {
        titlePublished: "Successfully Posted",
        titleFailed: "Failed Posts",
        titleDeleted: "Deleted Posts",
        newest: "Newest First",
        oldest: "Oldest First",
        allPlatforms: "All Platforms",
        allTime: "All Time",
        last7Days: "Last 7 days",
        last30Days: "Last 30 days",
        allAccounts: "All Accounts",
        threadsOnly: "Threads only",
        xOnly: "X only",
        deleted: "Deleted",
        postedBadge: "posted",
        failedBadge: "failed",
        deletedBadge: "deleted",
        noItemsPublished: "No successful posts yet.",
        noItemsFailed: "No failed posts.",
        noItemsDeleted: "No deleted posts.",
        type: "text",
        tabPublished: "Successfully Posted",
        tabFailed: "Failed",
        tabDeleted: "Deleted",
        toastDeleted: "Threads post deleted successfully.",
        toastExternallyDeleted:
          "This Threads post had already been deleted outside the app. The card is now marked as deleted.",
        toastSyncDeletedSingle:
          "Synced Posted. Marked 1 externally deleted Threads post.",
        toastSyncDeletedPlural:
          "Synced Posted. Marked {count} externally deleted Threads posts.",
        toastDeleteScopeRequired:
          "Reconnect this Threads account in Connections to grant delete permission.",
        toastDeleteFailed:
          "Failed to delete the Threads post. Try syncing first or reconnect the account.",
        toastMigrationRequired:
          "Apply the scheduled post delete-tracking migration before using delete sync.",
      },
      drafts: {
        title: "Drafts",
        empty: "No saved drafts yet for this workspace.",
        draft: "draft",
        published: "The draft was published.",
        scheduled: "The draft was scheduled.",
        deleted: "The draft was deleted.",
        error: "An error occurred while handling the draft.",
      },
      comments: {
        eyebrow: "Comments management",
        title: "Published Threads comments",
        description:
          "Review comments on published Threads posts in the active workspace and reply inline.",
        filtersTitle: "Filters",
        activeWorkspace: "Active workspace",
        accountLabel: "Account",
        allAccounts: "All accounts",
        sortLabel: "Sort",
        newest: "Newest first",
        oldest: "Oldest first",
        minUnansweredLabel: "Min unanswered",
        includeRepliedLabel: "Include replied",
        refresh: "Refresh",
        publishedPostsCount: "{count} published posts",
        contentTitle: "Content",
        visibleCommentsTemplate: "{comments} visible comments across {posts} posts",
        repliesSubmitHint: "Replies submit through a server action",
        noCommentsMatching: "No comments match the current filters.",
        noPublishedPosts:
          "No published Threads posts are available in this workspace yet.",
        demoNotice:
          "No real comments were found yet, so sample replied cards are shown below.",
        sampleBadge: "Sample",
        repliedBadge: "Replied",
        unansweredBadge: "Unanswered",
        openComment: "Open",
        writeReplyPlaceholder: "Write a reply...",
        replyHint: "Replies are sent to the original comment on Threads.",
        replyButton: "Reply",
        publishedPostLabel: "Published post",
        commentsUnansweredTemplate: "{comments} comments · {unanswered} unanswered",
        toastReplySent: "Reply sent.",
        errorsMissingFields: "Fill in the reply before submitting.",
        errorsInvalidWorkspace: "The active workspace could not be verified.",
        errorsInvalidPost:
          "That published Threads post is no longer available in this workspace.",
        errorsInvalidAccount:
          "The Threads account for this post could not be verified.",
        errorsMissingToken: "Missing Threads access token for this account.",
        errorsMissingScope:
          "Reconnect this Threads account in Connections to grant reply permissions.",
        errorsReplyFailed: "Failed to send the reply to Threads.",
        errorsGeneric: "Something went wrong while sending the reply.",
        noTextProvided: "No text provided.",
        threadsUser: "Threads user",
      },
      connections: {
        eyebrow: "Connections",
        title: "Connected accounts",
        description:
          "Manage the Threads accounts available to this workspace. Add another account, reconnect one, or disconnect accounts you no longer use.",
        connect: "Connect Threads account",
        reconnect: "Reconnect",
        disconnect: "Disconnect",
        connected: "A new Threads account was connected.",
        disconnected: "The account was disconnected.",
        genericError: "An unexpected error occurred.",
        noAccounts: "No Threads accounts are connected yet.",
        connectedAt: "Connected",
        status: {
          active: "Active",
          expired: "Expired",
          revoked: "Revoked",
          error: "Error",
        },
      },
      settings: {
        title: "Settings",
        description:
          "Tune queue behavior for the active workspace and keep publishing aligned with the content plan.",
        tabs: {
          settings: "Settings",
          queue: "Queue",
          billing: "Billing",
          plans: "Plans",
        },
        overview: {
          title: "Workspace scope",
          description:
            "Queue settings are saved per workspace so every workspace can keep its own posting rhythm.",
          currentWorkspace: "Current workspace",
          manageWorkspaces: "Manage workspaces",
        },
        profile: {
          title: "Profile",
          displayNameLabel: "Display Name",
          displayNameHint: "This name will be shown across the product.",
          emailLabel: "Email Address",
          save: "Save",
        },
        account: {
          title: "Email Address",
          currentEmail: "Current Email",
          emailPlaceholder: "you@example.com",
          changeEmail: "Change Email Address",
          passwordTitle: "Password",
          passwordPlaceholder: "Enter a new password (min 8 chars)",
          changePassword: "Change Password",
          sendReset: "Forgot Password? Send Reset Link",
        },
        security: {
          title: "Security",
          description:
            "Sign out of all devices and sessions. You will need to sign in again everywhere.",
          signOutAll: "Sign Out All Devices",
        },
        emailPreferences: {
          title: "Email Preferences",
          automationTitle: "Automation Emails",
          automationDescription:
            "Helpful reminders when you haven't posted or connected accounts.",
          failureTitle: "Post Failure Alerts",
          failureDescription:
            "Get an email when a scheduled post fails to publish.",
          deliveryNote:
            "Delivery setup can be configured later. For now, preferences are saved and ready.",
          save: "Save Preferences",
        },
        feedback: {
          profileSaved: "Profile updated.",
          emailRequested:
            "Email change requested. Check your inbox for confirmation.",
          passwordSaved: "Password updated successfully.",
          resetSent: "Password reset email sent.",
          preferencesSaved: "Email preferences saved.",
          invalidDisplayName:
            "Display name must be between 1 and 60 characters.",
          invalidEmail: "Enter a valid email address.",
          invalidPassword:
            "Password must be at least 8 characters.",
          profileFailed: "Failed to update profile.",
          emailFailed: "Failed to request email change.",
          passwordFailed: "Failed to update password.",
          resetFailed: "Failed to send reset email.",
          preferencesFailed: "Failed to save email preferences.",
          preferencesUnavailable:
            "Apply the latest profile settings migration before saving email preferences.",
          signoutFailed: "Failed to sign out all devices.",
        },
        queue: {
          title: "Queue Schedule",
          description:
            "Choose the weekly time slots and the source pool the queue runner should draw from.",
          timezone: "Timezone",
          sourceMode: "Source mode",
          aiType: "AI type",
          accounts: "Accounts",
          accountsAll: "All connected",
          accountsNone: "No account selected",
          accountsSelected: "selected",
          noConnectedAccounts:
            "No active Threads accounts are connected. Connect one in Connections first.",
          informational: "Informational",
          engagement: "Engagement",
          product: "Product-led",
          aiRandom: "AI random",
          draftRandom: "Draft random",
          randomizePostingTime: "Randomize posting time",
          randomizeDescription:
            "Shift each scheduled publish by a few minutes so the queue does not post at the exact same minute every time.",
          addTime: "Add time",
          removeTime: "Remove",
          active: "Active",
          inactive: "Inactive",
          timeLabel: "Time",
          activeSlots: "active slots",
          rowCount: "rows",
          save: "Save queue",
          saving: "Saving...",
          saved: "Queue settings saved.",
          failed: "Failed to save queue settings.",
          weekdaysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        },
        billing: {
          title: "Billing",
          description:
            "Review your current plan, workspace allowances, and billing status for this account.",
          comingSoon: "Online payment management is coming soon.",
          currentPlanTitle: "Current plan",
          planName: "Creator Plan",
          planPrice: "$0 / month (beta)",
          planStatus: "Active",
          includedTitle: "Included in this plan",
          includedAccounts: "Threads account connections",
          includedWorkspaces: "Workspace-level AI customization",
          includedQueue: "Queue schedule and multi-account publishing",
          usageTitle: "Usage this month",
          usagePosts: "Published posts",
          usageDrafts: "Saved drafts",
          paymentTitle: "Payment method",
          paymentDescription:
            "No payment method is required during beta. Billing controls will appear here when paid plans launch.",
          paymentCta: "Manage billing (soon)",
          invoicesTitle: "Invoices",
          invoicesEmpty: "No invoices yet.",
          invoicesUpdated: "Updated just now",
        },
        plans: {
          title: "Plans",
          description:
            "Plan comparison and upgrade controls will appear here next.",
          comingSoon: "Plans are coming soon.",
        },
      },
      bulk: {
        title: "Bulk Tools & Draft Approval",
        subtitle: "Approve generated drafts and configure automated posting intervals.",
        drafts: "Pending Drafts",
        selectAll: "Select All",
        config: "Schedule Configuration",
        interval: "Posting Interval",
        intervalHelper: "Hours between each post",
        exclusion: "Exclusion Hours",
        exclusionStart: "Do not post from",
        exclusionEnd: "Until",
        saveQueue: "Approve & Queue Schedule",
      },
      calendar: {
        title: "Calendar",
        month: "Month",
        week: "Week",
        jumpToday: "Today",
        noPostsForDay: "No posts scheduled for this day.",
        scheduled: "Scheduled",
        published: "Published",
        failed: "Failed",
        draft: "Draft",
        more: "more",
        postsOn: "Posts on",
        noAccess: "No access",
        unavailable: "Unavailable",
        noContent: "No content",
        synced: "Synced",
        weekdaysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        dateFormat: "MMM d",
        timeFormat: "a hh:mm",
      },
      workspaces: {
        title: "Workspaces",
        description: "Browse workspaces like folders and edit the selected workspace in one place.",
        currentBadge: "Current",
        noKeywords: "No keywords yet.",
        createWorkspace: "Create workspace",
        createEditorTitle: "Create workspace",
        createEditorDescription:
          "Fill all customization fields and save. The workspace is created only on save.",
        editorDescription:
          "Manage content direction, core keywords, and product framing for this workspace in one place.",
        backToAllWorkspaces: "Back to all workspaces",
        setCurrent: "Use as current workspace",
        activeNow: "Currently used for generation",
        workspaceName: "Workspace name",
        keywords: "Three core keywords",
        targetAudience: "Target audience",
        productLink: "Product link",
        commonInstruction: "Common instruction",
        typePoints: "Type-specific points",
        informationalFocus: "Informational point",
        engagementFocus: "Engagement point",
        productFocus: "Product-led point",
        save: "Save changes",
        createAndSave: "Create workspace",
        basics: "Basics",
        strategy: "Generation strategy",
        placeholderWorkspace: "e.g. bodycoachai",
        placeholderKeyword: "e.g. wellness",
        placeholderTargetAudience: "e.g. women in their 20s+ trying to lose weight",
        placeholderProductLink: "e.g. https://bodycoachai.app",
        placeholderCommonInstruction:
          "e.g. Avoid sounding absolute or clinical. Keep it persuasive and calm.",
        placeholderInfo: "e.g. Lean into practical tips and myth-busting with high signal.",
        placeholderEngagement:
          "e.g. Include a question or angle that naturally invites replies.",
        placeholderProduct:
          "e.g. Keep the body soft-sell and move the link CTA into the first reply.",
        created: "A new workspace was created.",
        saved: "Workspace settings were saved.",
      },
    },
    hook: {
      eyebrow: "Hook Studio",
      title: "Generate viral hook ideas from the central signal library.",
      description:
        "Search by category and keyword, preview the strongest source posts, and turn them into reusable hook drafts for X and Threads.",
      helper:
        "This section stays first in the layout because it is the main creative loop.",
      generate: "Generate hooks",
      categories: "Category",
      keyword: "Keyword",
      keywordPlaceholder: "AI agents, weight loss, build in public...",
      preview: "Viral posts",
      previewHeading: "Search preview",
      recent: "Generated hooks",
      recentHeading: "Recent outputs",
      previewEmpty:
        "Run a search to preview the source posts that will inform the hooks.",
      recentEmpty: "No generated hooks yet.",
      saved: "saved",
      matches: "matches",
      total: "total",
      virality: "Virality",
      seedPost: "Seed post",
      openSource: "Open source",
      unknown: "unknown",
    },
    scheduler: {
      eyebrow: "Publishing runway",
      title: "Queue a single post.",
      description:
        "Choose an account, draft the post, and set the publishing time. The scheduler keeps the queue visible without turning the dashboard into a settings page.",
      helper:
        "Secondary to Hook Studio, but still prominent enough to move fast.",
      account: "Account",
      postText: "Post copy",
      postPlaceholder: "Draft the post you want to schedule...",
      scheduledTime: "Scheduled time",
      action: "Queue schedule",
      queueTitle: "Scheduled posts",
      queueHeading: "Queue preview",
      queueDescription:
        "A quick look at what is waiting, publishing, or already live.",
      queueEmpty: "No scheduled posts yet.",
      publishingAccounts: "publishing accounts",
      queueItems: "queue items",
      connectAccountFirst: "Connect an account first",
      lastRun: "Last run:",
      lastAttempted: "Last attempted",
      openPublishedPost: "Open published post",
      items: "items",
    },
    common: {
      active: "Active",
      expired: "Expired",
      revoked: "Revoked",
      error: "Error",
      draft: "Draft",
      scheduled: "Scheduled",
      processing: "Processing",
      published: "Published",
      failed: "Failed",
      cancelled: "Cancelled",
      running: "Running",
      success: "Success",
    },
    errors: {
      missing_trigger_secret: "Trigger.dev secret key is missing.",
      missing_schedule_fields:
        "Account, post text, and scheduled time are required.",
      invalid_schedule_time: "Scheduled time is invalid.",
      schedule_must_be_future: "Scheduled time must be in the future.",
      only_x_supported: "This sprint only supports X scheduling.",
      unsupported_platform: "This platform is not supported for scheduling yet.",
      missing_glm_key: "GLM API key is missing.",
      missing_hook_fields: "Category and keyword are required to generate hooks.",
      invalid_category: "Selected category is invalid.",
      no_viral_posts: "No viral posts matched that category and keyword yet.",
      hook_generation_failed: "Hook generation failed. Try a different keyword.",
      x_oauth_state:
        "X OAuth state validation failed. Start the connection again.",
      x_oauth_callback: "X OAuth callback failed. Try connecting the account again.",
      threads_oauth_state:
        "Threads OAuth state validation failed. Start the connection again.",
      threads_oauth_callback:
        "Threads OAuth callback failed. Check the redirect URI and try again.",
    },
  },
  ko: {
    shell: {
      eyebrow: "워크스페이스",
      title: "바이럴 신호를 예약 포스트로 바꾸세요.",
      description:
        "Hook Studio를 중심에 두고, 소스 포스트를 찾고, 훅을 만들고, 준비되면 단일 포스트를 예약할 수 있습니다.",
      signOut: "로그아웃",
      ready: "준비된 워크스페이스",
      chips: {
        hookFirst: "훅 중심 작업 공간",
        singlePost: "단일 포스트 예약",
        platforms: "X + Threads 준비 완료",
      },
      sections: {
        accounts: "연결된 계정",
        accountInventory: "계정 인벤토리",
        accountInventoryDescription:
          "여기서 X와 Threads 계정을 유지하고, 설정을 다시 열지 않고도 발행에 활용합니다.",
      },
      stats: {
        signals: "신호 미리보기",
        hooks: "저장된 훅",
        scheduled: "예약 포스트",
        accounts: "활성 연결",
      },
      rail: {
        title: "워크스페이스 스냅샷",
        heading: "작업 흐름을 항상 보이게 유지하세요.",
        description:
          "이 사이드 레일은 신호 검색, 훅 정리, 예약 발행이라는 핵심 루프를 계속 보여줍니다.",
        helper: "사이드 레일은 가볍게 유지해서 Hook Studio가 중심이 되게 합니다.",
        signals: "신호",
        hooks: "훅",
        queue: "큐",
      },
      banners: {
        connected: "연결 성공:",
        scheduled: "예약 포스트가 큐에 추가되었습니다.",
        hooks: "새 훅 아이디어를 생성하고 저장했습니다.",
        actionFailed: "작업 실패:",
      },
      accounts: {
        total: "전체",
        empty: "아직 연결된 계정이 없습니다.",
        updatedPrefix: "업데이트",
        unnamed: "이름 없음",
      },
      connect: {
        xTitle: "X 연결",
        xDescription: "예약 발행을 위해 X 계정을 연결합니다.",
        threadsTitle: "Threads 연결",
        threadsDescription: "예약 발행을 위해 Threads 계정을 연결합니다.",
      },
    },
    sidebar: {
      brand: "Hustle Post",
      workspace: "Workspace",
      workspaceName: "main",
      createPostBtn: "포스트 생성",
      sections: {
        create: "Create",
        posts: "Posts",
        workspace: "Workspace",
        configuration: "Configuration",
      },
      nav: {
        newPost: "New post",
        studio: "Studio",
        bulkTools: "Bulk tools",
        calendar: "Calendar",
        allPosts: "All",
        scheduled: "Scheduled",
        posted: "Posted",
        drafts: "Drafts",
        analytics: "Analytics",
        commentsManagement: "댓글관리",
        workspaces: "워크스페이스",
        connections: "연결된 계정",
        settings: "설정",
        billing: "결제",
      },
      workspaceMenu: {
        label: "Workspace",
        manage: "Manage Workspaces",
        create: "New Workspace",
      },
      language: "언어",
      signOut: "로그아웃",
    },
    pages: {
      compose: {
        title: "Create text post",
        noThreadsAccounts: "먼저 Threads 계정을 연결해야 합니다.",
        draftsGenerated: "초안을 생성했습니다. 아래 최근 생성 초안에서 바로 수정할 수 있습니다.",
        published: "선택한 계정들에 초안을 즉시 발행했습니다.",
        publishedPartial:
          "일부 계정에는 발행했고, 일부 계정은 실패했습니다. Posted 탭에서 확인하세요.",
        scheduled: "선택한 계정들에 초안을 예약 발행 목록에 추가했습니다.",
        draftSaved: "선택한 계정들에 초안을 드래프트로 저장했습니다.",
        missingConnectedAccount: "상단에서 사용할 Threads 계정을 먼저 선택하세요.",
        missingAccountKeywords:
          "이 워크스페이스에는 키워드가 없습니다. 워크스페이스 설정에서 3개 키워드를 먼저 저장하세요.",
        noViralPosts: "아직 사용할 수 있는 바이럴 글이 없습니다. 잠시 후 다시 시도하세요.",
        ingestionUnavailable:
          "현재 수집 워커가 잠겨 있거나 사용할 수 없습니다. 잠시 후 다시 시도하세요.",
        draftGenerationFailed: "초안 생성에 실패했습니다. 커스터마이징을 줄이거나 다시 시도하세요.",
        genericError: "요청 처리 중 오류가 발생했습니다.",
        publishFailed: "발행에 실패했습니다. Posted 탭에서 실패 항목을 확인하세요.",
      },
      posts: {
        title: "All Posts",
        newest: "Newest First",
        platform: "All Platforms",
        time: "All Time",
        accounts: "All Accounts",
        info: "Info",
        empty: "예약된 포스트가 없습니다.",
        cancel: "Cancel",
      },
      scheduled: {
        title: "예약된 포스트",
        newest: "Newest First",
        platform: "All Platforms",
        time: "All Time",
        accounts: "All Accounts",
        info: "Info",
        empty: "예약된 항목이 없습니다.",
        cancel: "Cancel",
      },
      posted: {
        titlePublished: "성공적으로 발행됨",
        titleFailed: "발행 실패",
        titleDeleted: "삭제됨",
        newest: "최신순",
        oldest: "오래된순",
        allPlatforms: "모든 플랫폼",
        allTime: "전체 기간",
        last7Days: "최근 7일",
        last30Days: "최근 30일",
        allAccounts: "모든 계정",
        threadsOnly: "Threads만",
        xOnly: "X만",
        deleted: "삭제됨",
        postedBadge: "발행됨",
        failedBadge: "실패",
        deletedBadge: "삭제됨",
        noItemsPublished: "아직 발행 성공 내역이 없습니다.",
        noItemsFailed: "실패한 발행 내역이 없습니다.",
        noItemsDeleted: "삭제된 글이 없습니다.",
        type: "텍스트",
        tabPublished: "성공적으로 발행됨",
        tabFailed: "실패",
        tabDeleted: "삭제됨",
        toastDeleted: "Threads 글을 삭제했습니다.",
        toastExternallyDeleted:
          "앱 외부에서 이미 삭제된 Threads 글입니다. 카드 상태를 삭제됨으로 동기화했습니다.",
        toastSyncDeletedSingle:
          "Posted 동기화 완료: 외부에서 삭제된 Threads 글 1개를 반영했습니다.",
        toastSyncDeletedPlural:
          "Posted 동기화 완료: 외부에서 삭제된 Threads 글 {count}개를 반영했습니다.",
        toastDeleteScopeRequired:
          "삭제 권한을 적용하려면 Connections에서 이 Threads 계정을 다시 연결하세요.",
        toastDeleteFailed:
          "Threads 글 삭제에 실패했습니다. 먼저 동기화하거나 계정을 다시 연결해 주세요.",
        toastMigrationRequired:
          "삭제 동기화를 사용하려면 scheduled post delete-tracking 마이그레이션을 먼저 적용하세요.",
      },
      drafts: {
        title: "Drafts",
        empty: "이 워크스페이스에 저장된 드래프트가 아직 없습니다.",
        draft: "draft",
        published: "드래프트를 즉시 발행했습니다.",
        scheduled: "드래프트를 예약 발행에 추가했습니다.",
        deleted: "드래프트를 삭제했습니다.",
        error: "드래프트 작업 처리 중 오류가 발생했습니다.",
      },
      comments: {
        eyebrow: "댓글 관리",
        title: "발행된 Threads 댓글",
        description:
          "현재 워크스페이스에서 발행된 Threads 글의 댓글을 확인하고 바로 답글을 작성하세요.",
        filtersTitle: "필터",
        activeWorkspace: "현재 워크스페이스",
        accountLabel: "계정",
        allAccounts: "모든 계정",
        sortLabel: "정렬",
        newest: "최신순",
        oldest: "오래된순",
        minUnansweredLabel: "미답변 최소 개수",
        includeRepliedLabel: "답글 포함 보기",
        refresh: "새로고침",
        publishedPostsCount: "발행 글 {count}개",
        contentTitle: "댓글 목록",
        visibleCommentsTemplate:
          "{posts}개 글에서 댓글 {comments}개를 표시 중입니다.",
        repliesSubmitHint: "답글은 서버 액션으로 Threads에 전송됩니다.",
        noCommentsMatching: "현재 필터에 맞는 댓글이 없습니다.",
        noPublishedPosts:
          "현재 워크스페이스에 발행된 Threads 글이 아직 없습니다.",
        demoNotice:
          "아직 실제 댓글이 없어, 답글 예시가 포함된 샘플 카드를 표시합니다.",
        sampleBadge: "샘플",
        repliedBadge: "답글완료",
        unansweredBadge: "미답변",
        openComment: "열기",
        writeReplyPlaceholder: "답글을 입력하세요...",
        replyHint: "입력한 답글은 원본 댓글 아래에 Threads 답글로 발행됩니다.",
        replyButton: "답글 달기",
        publishedPostLabel: "원문",
        commentsUnansweredTemplate: "댓글 {comments}개 · 미답변 {unanswered}개",
        toastReplySent: "답글을 전송했습니다.",
        errorsMissingFields: "답글 내용을 입력한 뒤 다시 시도하세요.",
        errorsInvalidWorkspace: "활성 워크스페이스를 확인할 수 없습니다.",
        errorsInvalidPost:
          "해당 Threads 글이 현재 워크스페이스에 없거나 접근할 수 없습니다.",
        errorsInvalidAccount: "해당 Threads 계정을 확인할 수 없습니다.",
        errorsMissingToken: "이 계정의 Threads 액세스 토큰이 없습니다.",
        errorsMissingScope:
          "답글 권한이 필요합니다. Connections에서 이 계정을 다시 연결하세요.",
        errorsReplyFailed: "Threads 답글 전송에 실패했습니다.",
        errorsGeneric: "답글 처리 중 오류가 발생했습니다.",
        noTextProvided: "내용 없음",
        threadsUser: "Threads 사용자",
      },
      connections: {
        eyebrow: "Connections",
        title: "연결된 계정",
        description:
          "현재 워크스페이스에서 사용할 Threads 계정을 연결하고 관리합니다. 여기서 새 계정을 추가하거나, 더 이상 쓰지 않는 계정을 해제할 수 있습니다.",
        connect: "Threads 계정 연결",
        reconnect: "다시 연결",
        disconnect: "연결 해제",
        connected: "새 Threads 계정을 연결했습니다.",
        disconnected: "계정 연결을 해제했습니다.",
        genericError: "요청 처리 중 오류가 발생했습니다.",
        noAccounts: "아직 연결된 Threads 계정이 없습니다.",
        connectedAt: "연결일",
        status: {
          active: "활성",
          expired: "만료",
          revoked: "해제",
          error: "오류",
        },
      },
      settings: {
        title: "설정",
        description:
          "현재 워크스페이스의 큐 동작을 조정하고, 발행 흐름을 콘텐츠 계획에 맞게 유지합니다.",
        tabs: {
          settings: "설정",
          queue: "큐",
          billing: "결제",
          plans: "플랜",
        },
        overview: {
          title: "워크스페이스 범위",
          description:
            "큐 설정은 워크스페이스별로 저장되어, 워크스페이스마다 다른 발행 리듬을 유지할 수 있습니다.",
          currentWorkspace: "현재 워크스페이스",
          manageWorkspaces: "워크스페이스 관리",
        },
        profile: {
          title: "프로필",
          displayNameLabel: "표시 이름",
          displayNameHint: "이 이름은 서비스 전체에서 표시됩니다.",
          emailLabel: "이메일 주소",
          save: "저장",
        },
        account: {
          title: "이메일 주소",
          currentEmail: "현재 이메일",
          emailPlaceholder: "you@example.com",
          changeEmail: "이메일 주소 변경",
          passwordTitle: "비밀번호",
          passwordPlaceholder: "새 비밀번호 입력 (최소 8자)",
          changePassword: "비밀번호 변경",
          sendReset: "비밀번호를 잊으셨나요? 재설정 링크 보내기",
        },
        security: {
          title: "보안",
          description:
            "모든 디바이스와 세션에서 로그아웃합니다. 이후 모든 기기에서 다시 로그인해야 합니다.",
          signOutAll: "모든 기기 로그아웃",
        },
        emailPreferences: {
          title: "이메일 알림 설정",
          automationTitle: "자동화 알림 이메일",
          automationDescription:
            "발행이 오래 없거나 계정 연결이 비어 있을 때 리마인드 메일을 받습니다.",
          failureTitle: "발행 실패 알림",
          failureDescription:
            "예약 발행이 실패하면 이메일로 알림을 받습니다.",
          deliveryNote:
            "이메일 발송 인프라가 필요한 항목은 이후 연결할 수 있습니다. 현재는 설정값 저장까지 동작합니다.",
          save: "알림 설정 저장",
        },
        feedback: {
          profileSaved: "프로필을 저장했습니다.",
          emailRequested:
            "이메일 변경을 요청했습니다. 받은편지함에서 확인 메일을 확인하세요.",
          passwordSaved: "비밀번호를 변경했습니다.",
          resetSent: "비밀번호 재설정 메일을 전송했습니다.",
          preferencesSaved: "이메일 알림 설정을 저장했습니다.",
          invalidDisplayName: "표시 이름은 1자 이상 60자 이하로 입력하세요.",
          invalidEmail: "올바른 이메일 주소를 입력하세요.",
          invalidPassword: "비밀번호는 최소 8자 이상이어야 합니다.",
          profileFailed: "프로필 저장에 실패했습니다.",
          emailFailed: "이메일 변경 요청에 실패했습니다.",
          passwordFailed: "비밀번호 변경에 실패했습니다.",
          resetFailed: "비밀번호 재설정 메일 전송에 실패했습니다.",
          preferencesFailed: "이메일 알림 설정 저장에 실패했습니다.",
          preferencesUnavailable:
            "최신 프로필 설정 마이그레이션을 적용한 뒤 이메일 알림 설정을 저장할 수 있습니다.",
          signoutFailed: "모든 기기 로그아웃에 실패했습니다.",
        },
        queue: {
          title: "큐 스케줄",
          description:
            "주간 시간 슬롯과 큐 러너가 가져갈 글 소스를 선택합니다.",
          timezone: "시간대",
          sourceMode: "소스 모드",
          aiType: "AI 타입",
          accounts: "계정",
          accountsAll: "모든 연결 계정",
          accountsNone: "선택된 계정 없음",
          accountsSelected: "개 선택",
          noConnectedAccounts:
            "활성 Threads 계정이 없습니다. Connections에서 먼저 계정을 연결하세요.",
          informational: "정보성",
          engagement: "참여성",
          product: "홍보성",
          aiRandom: "AI 랜덤",
          draftRandom: "드래프트 랜덤",
          randomizePostingTime: "발행 시간 랜덤화",
          randomizeDescription:
            "예약 시각을 몇 분 단위로 흔들어 매번 같은 분에 발행되지 않게 합니다.",
          addTime: "시간 추가",
          removeTime: "삭제",
          active: "활성",
          inactive: "비활성",
          timeLabel: "시간",
          activeSlots: "활성 슬롯",
          rowCount: "행",
          save: "큐 저장",
          saving: "저장 중...",
          saved: "큐 설정을 저장했습니다.",
          failed: "큐 설정 저장에 실패했습니다.",
          weekdaysShort: ["일", "월", "화", "수", "목", "금", "토"],
        },
        billing: {
          title: "결제",
          description:
            "현재 플랜, 워크스페이스 허용 범위, 결제 상태를 여기서 확인할 수 있습니다.",
          comingSoon: "온라인 결제 관리는 곧 제공됩니다.",
          currentPlanTitle: "현재 플랜",
          planName: "Creator Plan",
          planPrice: "월 $0 (베타)",
          planStatus: "활성",
          includedTitle: "플랜 포함 기능",
          includedAccounts: "Threads 계정 연결",
          includedWorkspaces: "워크스페이스 단위 AI 커스터마이징",
          includedQueue: "큐 스케줄 및 다중 계정 발행",
          usageTitle: "이번 달 사용량",
          usagePosts: "발행된 글",
          usageDrafts: "저장된 초안",
          paymentTitle: "결제 수단",
          paymentDescription:
            "베타 기간에는 결제 수단이 필요하지 않습니다. 유료 플랜 오픈 시 이 화면에서 바로 관리할 수 있습니다.",
          paymentCta: "결제 관리 (준비 중)",
          invoicesTitle: "청구 내역",
          invoicesEmpty: "아직 청구 내역이 없습니다.",
          invoicesUpdated: "방금 업데이트됨",
        },
        plans: {
          title: "플랜",
          description:
            "플랜 비교와 업그레이드 제어는 다음 단계에서 여기로 들어옵니다.",
          comingSoon: "플랜 기능은 곧 제공됩니다.",
        },
      },
      bulk: {
        title: "Bulk Tools & Draft Approval",
        subtitle: "Approve generated drafts and configure automated posting intervals.",
        drafts: "Pending Drafts",
        selectAll: "Select All",
        config: "Schedule Configuration",
        interval: "Posting Interval",
        intervalHelper: "Hours between each post",
        exclusion: "Exclusion Hours",
        exclusionStart: "Do not post from",
        exclusionEnd: "Until",
        saveQueue: "Approve & Queue Schedule",
      },
      calendar: {
        title: "캘린더",
        month: "월간",
        week: "주간",
        jumpToday: "오늘",
        noPostsForDay: "이 날짜에 예정된 글이 없습니다.",
        scheduled: "예약됨",
        published: "발행됨",
        failed: "실패",
        draft: "초안",
        more: "개 더보기",
        postsOn: "발행/예약된 글",
        noAccess: "권한 없음",
        unavailable: "조회 불가",
        noContent: "내용 없음",
        synced: "동기화됨",
        weekdaysShort: ["일", "월", "화", "수", "목", "금", "토"],
        dateFormat: "M월 d일",
        timeFormat: "a hh:mm",
      },
      workspaces: {
        title: "워크스페이스",
        description:
          "워크스페이스를 폴더처럼 탐색하고, 선택한 워크스페이스의 생성 규칙을 이 화면에서 바로 수정할 수 있습니다.",
        currentBadge: "Current",
        noKeywords: "키워드가 아직 없습니다.",
        createWorkspace: "새 워크스페이스 만들기",
        createEditorTitle: "새 워크스페이스",
        createEditorDescription:
          "아래 커스터마이징을 모두 입력하고 저장하면 워크스페이스가 생성됩니다.",
        editorDescription:
          "이 워크스페이스에서 생성할 콘텐츠 방향, 키워드, 제품 노출 방식까지 한 번에 관리합니다.",
        backToAllWorkspaces: "모든 워크스페이스로 돌아가기",
        setCurrent: "현재 워크스페이스로 사용",
        activeNow: "현재 생성에 사용 중",
        workspaceName: "워크스페이스 이름",
        keywords: "핵심 키워드 3개",
        targetAudience: "타겟층",
        productLink: "제품 링크",
        commonInstruction: "공통 지시",
        typePoints: "콘텐츠 타입별 포인트",
        informationalFocus: "정보성 포인트",
        engagementFocus: "참여성 포인트",
        productFocus: "홍보성 포인트",
        save: "변경사항 저장",
        createAndSave: "워크스페이스 생성",
        basics: "기본 설정",
        strategy: "생성 전략",
        placeholderWorkspace: "예: bodycoachai",
        placeholderKeyword: "예: 다이어트",
        placeholderTargetAudience: "예: 20대 이상 다이어터 여성",
        placeholderProductLink: "예: https://bodycoachai.app",
        placeholderCommonInstruction:
          "예: 의료 조언처럼 단정하지 말고, 부드럽지만 설득력 있게 작성해줘.",
        placeholderInfo: "예: 저장하고 싶은 팁형, 잘못된 상식 바로잡기 중심으로.",
        placeholderEngagement:
          "예: 댓글을 유도할 질문이나 경험 공유 포인트를 꼭 넣어줘.",
        placeholderProduct:
          "예: 광고 티를 줄이고, 본문은 문제 인식 위주 / 첫 댓글에 링크 유도.",
        created: "새 워크스페이스를 만들었습니다.",
        saved: "워크스페이스 설정을 저장했습니다.",
      },
    },
    hook: {
      eyebrow: "Hook Studio",
      title: "중앙 신호 라이브러리에서 바이럴 훅을 생성하세요.",
      description:
        "카테고리와 키워드로 검색하고, 강한 소스 포스트를 미리 본 뒤, X와 Threads용 재사용 가능한 훅 초안을 만듭니다.",
      helper:
        "이 영역은 제품의 핵심 창작 루프라서 레이아웃에서 가장 먼저 보이게 둡니다.",
      generate: "훅 생성",
      categories: "카테고리",
      keyword: "키워드",
      keywordPlaceholder: "AI agents, weight loss, build in public...",
      preview: "바이럴 포스트",
      previewHeading: "검색 미리보기",
      recent: "생성된 훅",
      recentHeading: "최근 결과",
      previewEmpty:
        "검색을 실행하면 훅 생성에 사용될 소스 포스트를 여기서 미리 볼 수 있습니다.",
      recentEmpty: "아직 생성된 훅이 없습니다.",
      saved: "저장됨",
      matches: "매치",
      total: "전체",
      virality: "바이럴 점수",
      seedPost: "시드 포스트",
      openSource: "원문 열기",
      unknown: "알 수 없음",
    },
    scheduler: {
      eyebrow: "Publishing runway",
      title: "단일 포스트를 예약하세요.",
      description:
        "계정을 고르고, 포스트를 작성하고, 시간을 설정하세요. 설정 화면처럼 무겁지 않게 큐를 유지합니다.",
      helper: "Hook Studio보다 뒤에 두되, 빠르게 발행할 수 있을 정도로는 충분히 드러냅니다.",
      account: "계정",
      postText: "포스트 문구",
      postPlaceholder: "예약할 포스트를 작성하세요...",
      scheduledTime: "예약 시간",
      action: "예약 추가",
      queueTitle: "예약 포스트",
      queueHeading: "큐 미리보기",
      queueDescription: "대기 중이거나 발행 중, 이미 라이브인 항목을 빠르게 볼 수 있습니다.",
      queueEmpty: "아직 예약된 포스트가 없습니다.",
      publishingAccounts: "발행 계정",
      queueItems: "큐 항목",
      connectAccountFirst: "먼저 계정을 연결하세요",
      lastRun: "최근 실행:",
      lastAttempted: "최근 시도",
      openPublishedPost: "발행된 포스트 열기",
      items: "개",
    },
    common: {
      active: "활성",
      expired: "만료",
      revoked: "해제",
      error: "오류",
      draft: "초안",
      scheduled: "예약됨",
      processing: "처리 중",
      published: "발행됨",
      failed: "실패",
      cancelled: "취소됨",
      running: "실행 중",
      success: "성공",
    },
    errors: {
      missing_trigger_secret: "Trigger.dev 비밀 키가 없습니다.",
      missing_schedule_fields: "계정, 포스트 문구, 예약 시간이 모두 필요합니다.",
      invalid_schedule_time: "예약 시간이 올바르지 않습니다.",
      schedule_must_be_future: "예약 시간은 미래 시점이어야 합니다.",
      only_x_supported: "이 스프린트는 X 예약만 지원합니다.",
      unsupported_platform: "이 플랫폼은 아직 예약 발행을 지원하지 않습니다.",
      missing_glm_key: "GLM API 키가 없습니다.",
      missing_hook_fields: "훅 생성에는 카테고리와 키워드가 필요합니다.",
      invalid_category: "선택한 카테고리가 올바르지 않습니다.",
      no_viral_posts: "해당 카테고리와 키워드에 맞는 바이럴 포스트가 아직 없습니다.",
      hook_generation_failed: "훅 생성에 실패했습니다. 다른 키워드로 다시 시도하세요.",
      x_oauth_state: "X OAuth 상태 검증에 실패했습니다. 다시 연결해 주세요.",
      x_oauth_callback: "X OAuth 콜백 처리에 실패했습니다. 다시 연결해 주세요.",
      threads_oauth_state: "Threads OAuth 상태 검증에 실패했습니다. 다시 연결해 주세요.",
      threads_oauth_callback: "Threads OAuth 콜백 처리에 실패했습니다. Redirect URI를 확인하고 다시 시도하세요.",
    },
  },
};

export function getDashboardCopy(locale: Locale): DashboardCopy {
  return DASHBOARD_COPY[locale];
}
