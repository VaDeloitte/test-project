const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define new schema for the workflow
const newWorkflowSchema = new Schema({
    title: {
        type: String,
        required: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        maxlength: 5000
    },
    workflowType: {
        type: String,
        maxlength: 100
    },
    category: {
        type: String,        
        maxlength: 500
    },
    subcategory: {
        type: String,
        maxlength: 500
    },
    subsubcategory: {
        type: String,
        maxlength: 500
    },
    hitCount: {
        type: Number,
        default: 0
    },
    prompt: {
        type: String,
        required: true,
        maxlength: 20000
    },
    uploadRequired: {
        type: Boolean,
        required: true
    },
    uploadDescription: {
        type: String,
        maxlength: 1000,
        required(this: any): boolean {
            return this.uploadRequired === true
        }
    },
    createdBy: {
        type: String,
        maxlength: 100,
        default: 'system'
    },
    tgPublish: {
        type: Boolean,
        default: false
    },
    model: {
        type: String,
        maxlength: 50,
        default: 'gpt-4o'
    },
    triggers: {
        type: [String],
        default: []
    },
    citation: {
        type: Boolean,
        default: false
    },
    files: {
        type: [String],
        default: []
    },
    version: {
        type: Number,
        default: 1
    },
    rating: {
        type: {
            avgRating: Number,
            count: Number,
            totalRating: Number
        },
        default: {
            avgRating: 0,
            count: 0,
            totalRating: 0
        }
    }
}, {
    collection: 'workflows_v2',
    timestamps: true   
});


export default mongoose.models.WorkflowV2 || mongoose.model('WorkflowV2', newWorkflowSchema);